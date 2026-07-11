import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const KIBIBYTE = 1024;
const MINIMUM_PLATEAU_SAMPLES = 15;
const PLATEAU_WINDOW_SIZE = 10;
const RANGE_ABSOLUTE_ALLOWANCE = 4 * 1024 ** 2;
const RANGE_RELATIVE_ALLOWANCE = 0.03;
const GROWTH_ABSOLUTE_ALLOWANCE = 2 * 1024 ** 2;
const GROWTH_RELATIVE_ALLOWANCE = 0.015;

export interface ProcessSample {
  pid: number;
  parentPid: number;
  cpuTimeMs: number;
  residentBytes: number;
}

export type ProcessSnapshot = ReadonlyMap<number, ProcessSample>;

export interface MemoryPlateauAssessment {
  sampleCount: number;
  windowSampleCount: number;
  growthBytes: number;
  rangeBytes: number;
  slopeBytesPerCycle: number;
  plateau: boolean;
}

function parseCpuTimeMs(value: string): number {
  const fields = value.split(':').map(Number);
  if (fields.some(field => !Number.isFinite(field))) {
    throw new Error(`Invalid process CPU time: ${value}`);
  }

  let seconds = 0;
  for (const field of fields) seconds = seconds * 60 + field;
  return seconds * 1_000;
}

export function parseProcessSnapshot(output: string): Map<number, ProcessSample> {
  const processes = new Map<number, ProcessSample>();
  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s*$/.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    processes.set(pid, {
      pid,
      parentPid: Number(match[2]),
      cpuTimeMs: parseCpuTimeMs(match[3]),
      residentBytes: Number(match[4]) * KIBIBYTE,
    });
  }
  return processes;
}

function processTree(snapshot: ProcessSnapshot, rootPid: number): Set<number> {
  const selected = new Set<number>([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const process of snapshot.values()) {
      if (!selected.has(process.pid) && selected.has(process.parentPid)) {
        selected.add(process.pid);
        changed = true;
      }
    }
  }
  return selected;
}

export function summarizeIdleProcessUsage(
  before: ProcessSnapshot,
  after: ProcessSnapshot,
  rootPid: number,
  elapsedMs: number,
): { cpuPct: number; residentBytes: number; processCount: number } {
  const pids = processTree(after, rootPid);
  let cpuTimeMs = 0;
  let residentBytes = 0;
  for (const pid of pids) {
    const finalSample = after.get(pid);
    if (!finalSample) continue;
    cpuTimeMs += Math.max(0, finalSample.cpuTimeMs - (before.get(pid)?.cpuTimeMs ?? 0));
    residentBytes += finalSample.residentBytes;
  }
  return {
    cpuPct: (cpuTimeMs / elapsedMs) * 100,
    residentBytes,
    processCount: pids.size,
  };
}

function linearSlope(values: readonly number[]): number {
  const center = (values.length - 1) / 2;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    const offset = index - center;
    numerator += offset * value;
    denominator += offset * offset;
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function assessMemoryPlateau(samples: readonly number[]): MemoryPlateauAssessment {
  if (samples.length < MINIMUM_PLATEAU_SAMPLES) {
    throw new Error(`Memory plateau requires at least ${MINIMUM_PLATEAU_SAMPLES} cycles`);
  }
  if (samples.some(sample => !Number.isFinite(sample) || sample <= 0)) {
    throw new Error('Memory plateau samples must be positive finite byte counts');
  }

  const finalWindow = samples.slice(-PLATEAU_WINDOW_SIZE);
  const first = finalWindow[0];
  const last = finalWindow[finalWindow.length - 1];
  const minimum = Math.min(...finalWindow);
  const growthBytes = last - first;
  const rangeBytes = Math.max(...finalWindow) - minimum;
  const slopeBytesPerCycle = linearSlope(finalWindow);
  const projectedPositiveGrowth = Math.max(0, slopeBytesPerCycle)
    * (finalWindow.length - 1);
  const rangeAllowance = Math.max(
    RANGE_ABSOLUTE_ALLOWANCE,
    minimum * RANGE_RELATIVE_ALLOWANCE,
  );
  const growthAllowance = Math.max(
    GROWTH_ABSOLUTE_ALLOWANCE,
    minimum * GROWTH_RELATIVE_ALLOWANCE,
  );
  const half = finalWindow.length / 2;
  const earlierMean = average(finalWindow.slice(0, half));
  const laterMean = average(finalWindow.slice(half));

  return {
    sampleCount: samples.length,
    windowSampleCount: finalWindow.length,
    growthBytes,
    rangeBytes,
    slopeBytesPerCycle,
    plateau: rangeBytes <= rangeAllowance
      && projectedPositiveGrowth <= growthAllowance
      && laterMean <= earlierMean + growthAllowance,
  };
}

export async function readProcessSnapshot(): Promise<ProcessSnapshot> {
  if (process.platform === 'win32') {
    throw new Error('Graph benchmark process metrics require a POSIX ps implementation');
  }
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,time=,rss=']);
  return parseProcessSnapshot(stdout);
}

export function readProcessTreeResidentBytes(
  snapshot: ProcessSnapshot,
  rootPid: number,
): number {
  let residentBytes = 0;
  for (const pid of processTree(snapshot, rootPid)) {
    residentBytes += snapshot.get(pid)?.residentBytes ?? 0;
  }
  return residentBytes;
}

export async function readStableProcessTreeResidentBytes(
  rootPid: number,
): Promise<number> {
  const stabilityThresholdBytes = 1024 ** 2;
  let previous: number | undefined;
  let stableIntervals = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = readProcessTreeResidentBytes(await readProcessSnapshot(), rootPid);
    if (previous !== undefined && Math.abs(current - previous) <= stabilityThresholdBytes) {
      stableIntervals += 1;
      if (stableIntervals >= 2) return current;
    } else {
      stableIntervals = 0;
    }
    previous = current;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return previous ?? 0;
}

export async function measureIdleProcessUsage(
  rootPid: number,
  idleMs: number,
): Promise<{ cpuPct: number; residentBytes: number; processCount: number }> {
  const before = await readProcessSnapshot();
  const startedAt = performance.now();
  await new Promise(resolve => setTimeout(resolve, idleMs));
  const after = await readProcessSnapshot();
  return summarizeIdleProcessUsage(before, after, rootPid, performance.now() - startedAt);
}

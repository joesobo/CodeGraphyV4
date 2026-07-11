import { setTimeout as wait } from 'node:timers/promises';
import pidusage from 'pidusage';
import {
  discoverVsCodeSessionProcesses,
  listSystemProcesses,
  type ProcessDiscovery,
  type VsCodeSessionIdentity,
  type VsCodeSessionProcesses,
} from './discovery';

export interface CpuProcessStats {
  cpu: number;
}

export type CpuStatsByPid = Readonly<Record<string, CpuProcessStats | undefined>>;

export interface IdleCpuSampler {
  clear(): void;
  sample(pids: readonly number[]): Promise<CpuStatsByPid>;
}

export interface IdleCpuClock {
  now(): number;
  sleep(durationMs: number): Promise<void>;
}

export interface IdleCpuSampleDependencies {
  clock: IdleCpuClock;
  discoverProcesses: ProcessDiscovery;
  sampler: IdleCpuSampler;
}

export interface IdleCpuSampleOptions {
  durationMs: number;
  identity: VsCodeSessionIdentity;
  sampleIntervalMs?: number;
}

export interface IdleCpuSampleResult extends VsCodeSessionProcesses {
  extensionHostIdleCpuPct: number;
  idleCpuPct: number;
  rendererIdleCpuPct: number;
}

interface IdleCpuAverages {
  extensionHostIdleCpuPct: number;
  idleCpuPct: number;
  rendererIdleCpuPct: number;
}

const defaultDependencies: IdleCpuSampleDependencies = {
  clock: {
    now: () => performance.now(),
    sleep: async (durationMs) => {
      await wait(durationMs);
    },
  },
  discoverProcesses: listSystemProcesses,
  sampler: {
    clear: () => pidusage.clear(),
    sample: async pids => pidusage([...pids]),
  },
};

function requireDuration(durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Idle CPU sample duration must be a positive finite number');
  }
}

function requireSampleInterval(sampleIntervalMs: number): void {
  if (!Number.isFinite(sampleIntervalMs) || sampleIntervalMs <= 0) {
    throw new Error('Idle CPU sample interval must be a positive finite number');
  }
}

function requireCpuStats(
  pids: readonly number[],
  stats: CpuStatsByPid,
): void {
  for (const pid of pids) {
    const cpu = stats[String(pid)]?.cpu;
    if (cpu === undefined) {
      throw new Error(`Missing CPU statistics for VS Code process ${pid}`);
    }
    if (!Number.isFinite(cpu)) {
      throw new Error(`Invalid CPU statistics for VS Code process ${pid}`);
    }
  }
}

function aggregateCpuPct(
  pids: readonly number[],
  stats: CpuStatsByPid,
): number {
  return pids.reduce((total, pid) => (
    total + Math.max(0, stats[String(pid)]?.cpu ?? 0)
  ), 0);
}

async function sampleAcrossIdleDuration(
  session: VsCodeSessionProcesses,
  durationMs: number,
  sampleIntervalMs: number,
  clock: IdleCpuClock,
  sampler: IdleCpuSampler,
): Promise<IdleCpuAverages> {
  let sampledDurationMs = 0;
  let weightedCpuPct = 0;
  let weightedExtensionHostCpuPct = 0;
  let weightedRendererCpuPct = 0;

  while (sampledDurationMs < durationMs) {
    const intervalDurationMs = Math.min(
      sampleIntervalMs,
      durationMs - sampledDurationMs,
    );
    const beforeSleep = clock.now();
    await clock.sleep(intervalDurationMs);
    if (clock.now() <= beforeSleep) {
      throw new Error('Idle CPU sample clock did not advance');
    }

    const stats = await sampler.sample(session.targetPids);
    requireCpuStats(session.targetPids, stats);
    weightedCpuPct += aggregateCpuPct(session.targetPids, stats) * intervalDurationMs;
    weightedRendererCpuPct += aggregateCpuPct(session.rendererPids, stats) * intervalDurationMs;
    weightedExtensionHostCpuPct += aggregateCpuPct(session.extensionHostPids, stats) * intervalDurationMs;
    sampledDurationMs += intervalDurationMs;
  }

  return {
    extensionHostIdleCpuPct: Math.max(0, weightedExtensionHostCpuPct / sampledDurationMs),
    idleCpuPct: Math.max(0, weightedCpuPct / sampledDurationMs),
    rendererIdleCpuPct: Math.max(0, weightedRendererCpuPct / sampledDurationMs),
  };
}

export async function sampleVsCodeIdleCpu(
  options: IdleCpuSampleOptions,
  dependencies: IdleCpuSampleDependencies = defaultDependencies,
): Promise<IdleCpuSampleResult> {
  try {
    requireDuration(options.durationMs);
    const sampleIntervalMs = options.sampleIntervalMs ?? 1_000;
    requireSampleInterval(sampleIntervalMs);
    const processes = await dependencies.discoverProcesses();
    const session = discoverVsCodeSessionProcesses(processes, options.identity);

    const baseline = await dependencies.sampler.sample(session.targetPids);
    requireCpuStats(session.targetPids, baseline);
    const averages = await sampleAcrossIdleDuration(
      session,
      options.durationMs,
      sampleIntervalMs,
      dependencies.clock,
      dependencies.sampler,
    );

    return {
      ...session,
      ...averages,
    };
  } finally {
    dependencies.sampler.clear();
  }
}

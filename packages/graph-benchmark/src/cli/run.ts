import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, hostname, release } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  chromium,
  type Browser,
  type BrowserServer,
} from '@playwright/test';

import type { BenchmarkArguments } from './arguments';
import { createSyntheticFixture } from '../fixture/presets';
import {
  resolveGraphBenchmarkDriver,
  selectSyntheticDragTargetDetails,
  SYNTHETIC_DRAG_PATH_ID,
  SYNTHETIC_DRAG_SCENARIO_ID,
  type GraphBenchmarkDriver,
} from '../harness/driver';
import { RELEASE_SETTLE_OBSERVATION_MS } from '../harness/currentRenderer/measure';
import type { GraphBenchmarkServer } from '../harness/currentRenderer/server';
import { summarizeRenderedFrames } from '../metrics/frames';
import { DEFAULT_INTERACTION_THRESHOLDS } from '../metrics/interaction';
import {
  measureIdleProcessUsage,
  readStableProcessTreeResidentBytes,
} from '../metrics/process';
import {
  createAggregateBenchmarkReport,
  createFailedAggregateBenchmarkReport,
  type AggregateGraphBenchmarkReport,
  type BenchmarkConfiguration,
  type BenchmarkEnvironment,
  type BenchmarkSource,
  type CompletedBenchmarkRun,
  type FailedAggregateGraphBenchmarkReport,
} from '../report/model';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const viewport = { width: 1280, height: 720, deviceScaleFactor: 1 } as const;

export interface GraphBenchmarkRunResult {
  outputPath: string;
  report: AggregateGraphBenchmarkReport | FailedAggregateGraphBenchmarkReport;
}

async function buildWebview(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['--filter', '@codegraphy-dev/extension', 'run', 'build:webview'],
      { cwd: repositoryRoot, stdio: 'inherit' },
    );
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Webview build exited with code ${code ?? 'unknown'}`));
    });
  });
}

function createEnvironment(browserVersion = 'unavailable'): BenchmarkEnvironment {
  return {
    browser: 'chromium',
    browserVersion,
    cpuModel: cpus()[0]?.model ?? 'unknown',
    headless: true,
    hostname: hostname(),
    nodeVersion: process.version,
    osRelease: release(),
    platform: `${process.platform}-${process.arch}`,
  };
}

async function writeReport(
  outputPath: string,
  report: AggregateGraphBenchmarkReport | FailedAggregateGraphBenchmarkReport,
): Promise<string> {
  const absolutePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(repositoryRoot, outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  return absolutePath;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error
    && (error.name === 'TimeoutError' || /timed? out|timeout/i.test(error.message));
}

function benchmarkConfiguration(
  options: BenchmarkArguments,
  targetNodeId: string,
  neighborNodeIds: string[],
): BenchmarkConfiguration {
  return {
    scenarioId: SYNTHETIC_DRAG_SCENARIO_ID,
    pathId: SYNTHETIC_DRAG_PATH_ID,
    targetNodeId,
    neighborNodeIds: [...neighborNodeIds],
    interactionThresholds: { ...DEFAULT_INTERACTION_THRESHOLDS },
    releaseObservationMs: RELEASE_SETTLE_OBSERVATION_MS,
    viewport,
    runCount: options.runs,
    idleMs: options.idleMs,
    memoryCycles: options.memoryCycles,
    timeoutMs: options.timeoutMs,
  };
}

async function readBenchmarkSource(): Promise<BenchmarkSource> {
  const [{ stdout: revision }, { stdout: status }, { stdout: diff }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot }),
    execFileAsync('git', ['status', '--porcelain'], { cwd: repositoryRoot }),
    execFileAsync('git', ['diff', '--binary', 'HEAD'], {
      cwd: repositoryRoot,
      maxBuffer: 64 * 1024 ** 2,
    }),
  ]);
  const dirty = status.trim().length > 0;
  if (!dirty) return { revision: revision.trim(), dirty: false };

  const { stdout: untrackedOutput } = await execFileAsync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '-z'],
    { cwd: repositoryRoot, encoding: 'buffer', maxBuffer: 64 * 1024 ** 2 },
  );
  const untracked = untrackedOutput
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort();
  const hash = createHash('sha256').update(diff);
  for (const relativePath of untracked) {
    hash.update(relativePath);
    hash.update(await readFile(path.join(repositoryRoot, relativePath)));
  }
  return {
    revision: revision.trim(),
    dirty: true,
    diffHash: `sha256:${hash.digest('hex')}`,
  };
}

async function readBaselineReport(
  baselinePath: string | undefined,
): Promise<{ path: string; report: AggregateGraphBenchmarkReport } | undefined> {
  if (!baselinePath) return undefined;
  const absolutePath = path.isAbsolute(baselinePath)
    ? baselinePath
    : path.join(repositoryRoot, baselinePath);
  const report = JSON.parse(await readFile(absolutePath, 'utf8')) as AggregateGraphBenchmarkReport;
  if (report.schemaVersion !== 3 || report.status !== 'complete') {
    throw new Error(`Baseline is not a complete schema-v3 report: ${absolutePath}`);
  }
  return { path: baselinePath, report };
}

async function measureClosedGraphCycle(
  browser: Browser,
  driver: GraphBenchmarkDriver,
  serverUrl: string,
  timeoutMs: number,
  browserPid: number,
): Promise<number> {
  const context = await browser.newContext({
    deviceScaleFactor: viewport.deviceScaleFactor,
    viewport: { width: viewport.width, height: viewport.height },
  });
  try {
    const page = await context.newPage();
    await driver.waitForSettlement(page, serverUrl, timeoutMs);
  } finally {
    await context.close();
  }
  return readStableProcessTreeResidentBytes(browserPid);
}

async function runMeasurement(
  run: number,
  options: BenchmarkArguments,
  browser: Browser,
  driver: GraphBenchmarkDriver,
  serverUrl: string,
  browserPid: number,
  targetNodeId: string,
  neighborNodeIds: string[],
): Promise<CompletedBenchmarkRun> {
  const context = await browser.newContext({
    deviceScaleFactor: viewport.deviceScaleFactor,
    viewport: { width: viewport.width, height: viewport.height },
  });
  let settleTimeMs: number;
  let initialSettlementObserved = true;
  let heapAfterLoadBytes: number;
  let processAfterLoadBytes: number;
  let idleCpuPct: number;
  let drag: Awaited<ReturnType<GraphBenchmarkDriver['runSyntheticDrag']>>;

  try {
    const page = await context.newPage();
    if (options.physicsHome === 'main-thread') {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'Worker', {
          configurable: true,
          value: undefined,
        });
      });
    }
    const settlementTimeoutMs = options.attribution
      ? Math.min(options.timeoutMs, 30_000)
      : options.timeoutMs;
    try {
      const settlement = await driver.waitForSettlement(
        page,
        serverUrl,
        settlementTimeoutMs,
      );
      settleTimeMs = settlement.settleTimeMs;
    } catch (error) {
      if (!options.attribution || !isTimeout(error)) throw error;
      initialSettlementObserved = false;
      settleTimeMs = settlementTimeoutMs;
    }

    const heap = await driver.measureHeapAfterSettlement(page);
    heapAfterLoadBytes = heap.usedSize;
    processAfterLoadBytes = await readStableProcessTreeResidentBytes(browserPid);
    idleCpuPct = (await measureIdleProcessUsage(browserPid, options.idleMs)).cpuPct;
    drag = await driver.runSyntheticDrag(
      page,
      targetNodeId,
      neighborNodeIds,
      options.timeoutMs,
      options.attribution,
    );
  } finally {
    await context.close();
  }

  const afterCloseCycleBytes: number[] = [];
  for (let cycle = 0; cycle < options.memoryCycles; cycle += 1) {
    afterCloseCycleBytes.push(await measureClosedGraphCycle(
      browser,
      driver,
      serverUrl,
      options.timeoutMs,
      browserPid,
    ));
  }
  const frameMetrics = summarizeRenderedFrames(
    drag.frameTimesMs,
    drag.durationMs,
    drag.refreshRateHz,
  );

  return {
    run,
    status: 'complete',
    metrics: {
      drag: {
        ...drag,
        fps: frameMetrics.fps,
        frameTimeMs: frameMetrics.frameTimeMs,
        refreshRateHz: frameMetrics.refreshRateHz,
        refreshUtilization: frameMetrics.refreshUtilization,
      },
      settleTimeMs,
      initialSettlementObserved,
      idleCpuPct,
      memory: {
        heapAfterLoadBytes,
        processAfterLoadBytes,
        afterCloseCycleBytes,
      },
    },
  };
}

export async function runGraphBenchmark(
  options: BenchmarkArguments,
): Promise<GraphBenchmarkRunResult> {
  const fixture = createSyntheticFixture(options.fixture, options.seed);
  const { targetNodeId, neighborNodeIds } = selectSyntheticDragTargetDetails(fixture);
  const configuration = benchmarkConfiguration(options, targetNodeId, neighborNodeIds);
  const source = await readBenchmarkSource();
  let browser: Browser | undefined;
  let browserServer: BrowserServer | undefined;
  let server: GraphBenchmarkServer | undefined;
  let stage = 'build';
  let environment = createEnvironment();
  const completedRuns: CompletedBenchmarkRun[] = [];

  try {
    const driver = resolveGraphBenchmarkDriver(options.renderer);
    const baseline = await readBaselineReport(options.baselinePath);
    await buildWebview();
    stage = 'browser-launch';
    browserServer = await chromium.launchServer({
      headless: true,
      args: [
        '--enable-unsafe-webgpu',
        ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
      ],
    });
    const browserPid = browserServer.process().pid;
    if (!browserPid) throw new Error('Chromium benchmark process has no pid');
    browser = await chromium.connect(browserServer.wsEndpoint());
    environment = createEnvironment(browser.version());
    server = await driver.startServer(fixture);

    for (let run = 1; run <= options.runs; run += 1) {
      stage = `measurement-run-${run}`;
      completedRuns.push(await runMeasurement(
        run,
        options,
        browser,
        driver,
        server.url,
        browserPid,
        targetNodeId,
        neighborNodeIds,
      ));
    }

    const report = createAggregateBenchmarkReport({
      fixture,
      renderer: options.renderer,
      runs: completedRuns,
      environment,
      configuration,
      source,
      baseline,
    });
    const outputPath = await writeReport(options.outputPath, report);
    return { outputPath, report };
  } catch (error) {
    const report = createFailedAggregateBenchmarkReport({
      fixture,
      renderer: options.renderer,
      configuration,
      source,
      runs: completedRuns,
      environment,
      stage,
      message: error instanceof Error ? error.message : String(error),
      timedOut: isTimeout(error),
    });
    const outputPath = await writeReport(options.outputPath, report);
    return { outputPath, report };
  } finally {
    await browser?.close().catch(() => undefined);
    await browserServer?.close().catch(() => undefined);
    await server?.close().catch(() => undefined);
  }
}

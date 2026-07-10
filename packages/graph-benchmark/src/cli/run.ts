import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser } from '@playwright/test';

import type { BenchmarkArguments } from './arguments';
import { createSyntheticFixture } from '../fixture/presets';
import {
  measureCurrentRendererHeapAfterSettlement,
  measureCurrentRendererHover,
  runCurrentRendererPanZoom,
  waitForCurrentRendererSettlement,
} from '../harness/currentRenderer/measure';
import {
  startGraphBenchmarkServer,
  type GraphBenchmarkServer,
} from '../harness/currentRenderer/server';
import { summarizeDistribution } from '../metrics/distribution';
import { summarizeRenderedFrames } from '../metrics/frames';
import {
  createCompletedBenchmarkReport,
  createFailedBenchmarkReport,
  type BenchmarkEnvironment,
  type GraphBenchmarkReport,
} from '../report/model';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const viewport = { width: 1280, height: 720, deviceScaleFactor: 1 } as const;
const scenarioId = 'pan-zoom-v1';

export interface GraphBenchmarkRunResult {
  outputPath: string;
  report: GraphBenchmarkReport;
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
    headless: true,
    nodeVersion: process.version,
    platform: `${process.platform}-${process.arch}`,
  };
}

async function writeReport(
  outputPath: string,
  report: GraphBenchmarkReport,
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

export async function runGraphBenchmark(
  options: BenchmarkArguments,
): Promise<GraphBenchmarkRunResult> {
  const fixture = createSyntheticFixture(options.fixture, options.seed);
  let browser: Browser | undefined;
  let server: GraphBenchmarkServer | undefined;
  let stage = 'build';
  let environment = createEnvironment();

  try {
    if (options.renderer !== 'current') {
      throw new Error(`Renderer is not available yet: ${options.renderer}`);
    }

    await buildWebview();
    stage = 'browser-launch';
    browser = await chromium.launch({ headless: true });
    environment = createEnvironment(browser.version());
    server = await startGraphBenchmarkServer(fixture);

    stage = 'settle';
    const interactionContext = await browser.newContext({
      deviceScaleFactor: viewport.deviceScaleFactor,
      viewport: { width: viewport.width, height: viewport.height },
    });
    const interactionPage = await interactionContext.newPage();
    const settlement = await waitForCurrentRendererSettlement(
      interactionPage,
      server.url,
      options.timeoutMs,
    );

    stage = 'hover';
    const hoverLatencies = await measureCurrentRendererHover(
      interactionPage,
      fixture.graph.nodes[0].id,
      fixture.summary.nodeCount >= 50_000 ? 5 : 20,
      Math.min(options.timeoutMs, 30_000),
    );

    stage = 'pan-zoom';
    const frames = await runCurrentRendererPanZoom(interactionPage);

    stage = 'heap';
    const emptyPage = await interactionContext.newPage();
    const heapBytes = await measureCurrentRendererHeapAfterSettlement(
      interactionPage,
      emptyPage,
      server.url,
      options.timeoutMs,
    );
    await interactionContext.close();

    const frameMetrics = summarizeRenderedFrames(frames.frameTimesMs, frames.durationMs);
    const report = createCompletedBenchmarkReport({
      fixture,
      renderer: options.renderer,
      scenario: {
        id: scenarioId,
        durationMs: frames.durationMs,
        viewport,
      },
      metrics: {
        ...frameMetrics,
        settleTimeMs: settlement.settleTimeMs,
        hoverLatencyMs: summarizeDistribution(hoverLatencies),
        heapBytes,
      },
      environment,
    });
    const outputPath = await writeReport(options.outputPath, report);
    return { outputPath, report };
  } catch (error) {
    const report = createFailedBenchmarkReport({
      fixture,
      renderer: options.renderer,
      scenarioId,
      environment,
      stage,
      message: error instanceof Error ? error.message : String(error),
      timedOut: isTimeout(error),
    });
    const outputPath = await writeReport(options.outputPath, report);
    return { outputPath, report };
  } finally {
    await browser?.close();
    await server?.close();
  }
}

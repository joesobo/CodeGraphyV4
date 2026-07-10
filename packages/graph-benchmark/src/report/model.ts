import type { BenchmarkRenderer } from '../cli/arguments';
import type { BenchmarkFixture } from '../fixture/presets';

export interface BenchmarkEnvironment {
  browser: string;
  browserVersion: string;
  headless: boolean;
  nodeVersion: string;
  platform: string;
}

export interface DistributionMetrics {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  sampleCount: number;
}

export interface BenchmarkMetrics {
  fps: number;
  settleTimeMs: number;
  frameTimeMs: DistributionMetrics & {
    over16ms: number;
    over33ms: number;
  };
  hoverLatencyMs: DistributionMetrics;
  heapBytes: {
    emptyUsed: number;
    settledUsed: number;
    retainedDelta: number;
    embedderUsed: number;
    backingStorage: number;
  };
}

export interface GraphBenchmarkReport {
  schemaVersion: 1;
  status: 'complete' | 'failed' | 'timeout';
  renderer: BenchmarkRenderer;
  fixture: {
    name: string;
    seed: number;
    generatorVersion: number;
    nodeCount: number;
    edgeCount: number;
    hash: string;
  };
  scenario: {
    id: string;
    durationMs?: number;
    viewport?: {
      width: number;
      height: number;
      deviceScaleFactor: number;
    };
  };
  metrics?: BenchmarkMetrics;
  error?: {
    stage: string;
    message: string;
  };
  environment: BenchmarkEnvironment;
}

interface FailedBenchmarkReportOptions {
  fixture: BenchmarkFixture;
  renderer: BenchmarkRenderer;
  scenarioId: string;
  environment: BenchmarkEnvironment;
  stage: string;
  message: string;
  timedOut: boolean;
}

function fixtureIdentity(fixture: BenchmarkFixture): GraphBenchmarkReport['fixture'] {
  return {
    name: fixture.source.name,
    seed: fixture.source.seed,
    generatorVersion: fixture.source.generatorVersion,
    nodeCount: fixture.summary.nodeCount,
    edgeCount: fixture.summary.edgeCount,
    hash: fixture.fixtureHash,
  };
}

export function createFailedBenchmarkReport(
  options: FailedBenchmarkReportOptions,
): GraphBenchmarkReport {
  return {
    schemaVersion: 1,
    status: options.timedOut ? 'timeout' : 'failed',
    renderer: options.renderer,
    fixture: fixtureIdentity(options.fixture),
    scenario: { id: options.scenarioId },
    error: {
      stage: options.stage,
      message: options.message,
    },
    environment: options.environment,
  };
}

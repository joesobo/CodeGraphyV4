import { isDeepStrictEqual } from 'node:util';

import type { BenchmarkRenderer } from '../cli/arguments';
import type { BenchmarkFixture } from '../fixture/presets';
import {
  assessMemoryPlateau,
  type MemoryPlateauAssessment,
} from '../metrics/process';

export interface BenchmarkEnvironment {
  browser: string;
  browserVersion: string;
  cpuModel: string;
  headless: boolean;
  hostname: string;
  nodeVersion: string;
  osRelease: string;
  platform: string;
}

export interface DistributionMetrics {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  sampleCount: number;
}

export interface FrameMetrics {
  fps: number;
  refreshRateHz: number;
  refreshUtilization: number;
  frameTimeMs: DistributionMetrics & {
    over16ms: number;
    over33ms: number;
  };
}

export interface CompletedBenchmarkRun {
  run: number;
  status: 'complete';
  metrics: {
    drag: {
      durationMs: number;
      fps: number;
      frameTimeMs: FrameMetrics['frameTimeMs'];
      refreshRateHz: number;
      refreshUtilization: number;
      draggedNodeId: string;
      pointerMoves: number;
      nodeTravelPx: number;
      responsive: boolean;
      finitePositions: boolean;
      settledCollisionViolationCount: number;
      duringDragCollisionViolationCount: number;
      releasedCollisionViolationCount: number;
    };
    settleTimeMs: number;
    idleCpuPct: number;
    memory: {
      heapAfterLoadBytes: number;
      processAfterLoadBytes: number;
      afterCloseCycleBytes: number[];
    };
  };
}

export interface BenchmarkConfiguration {
  scenarioId: 'synthetic-node-drag-v3';
  pathId: 'centered-node-sine-v1';
  targetNodeId: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  runCount: number;
  idleMs: number;
  memoryCycles: number;
  timeoutMs: number;
}

export interface BenchmarkSource {
  revision: string;
  dirty: boolean;
  diffHash?: string;
}

interface FixtureIdentity {
  name: string;
  seed: number;
  generatorVersion: number;
  nodeCount: number;
  edgeCount: number;
  hash: string;
}

export interface BenchmarkAverages {
  dragFps: number;
  settleTimeMs: number;
  idleCpuPct: number;
  heapAfterLoadBytes: number;
  processAfterLoadBytes: number;
  memoryAfterCyclesBytes: number;
}

export interface SampleStatistics {
  mean: number;
  min: number;
  max: number;
  standardDeviation: number;
  coefficientOfVariation: number | null;
}

export interface AggregateGraphBenchmarkReport {
  schemaVersion: 2;
  status: 'complete';
  renderer: BenchmarkRenderer;
  fixture: FixtureIdentity;
  runCount: number;
  averages: BenchmarkAverages;
  statistics: Record<keyof BenchmarkAverages, SampleStatistics>;
  unstableMetrics: Array<keyof BenchmarkAverages>;
  memoryPlateau: MemoryPlateauAssessment;
  tierPassed: boolean;
  configuration: BenchmarkConfiguration;
  source: BenchmarkSource;
  baseline: {
    kind: 'self' | 'report';
    path?: string;
    revision: string;
    deltas: BenchmarkAverages;
  };
  runs: CompletedBenchmarkRun[];
  environment: BenchmarkEnvironment;
}

export interface FailedAggregateGraphBenchmarkReport {
  schemaVersion: 2;
  status: 'failed' | 'timeout';
  renderer: BenchmarkRenderer;
  fixture: FixtureIdentity;
  configuration: BenchmarkConfiguration;
  source: BenchmarkSource;
  runs: CompletedBenchmarkRun[];
  error: {
    stage: string;
    message: string;
  };
  environment: BenchmarkEnvironment;
}

function fixtureIdentity(fixture: BenchmarkFixture): FixtureIdentity {
  return {
    name: fixture.source.name,
    seed: fixture.source.seed,
    generatorVersion: fixture.source.generatorVersion,
    nodeCount: fixture.summary.nodeCount,
    edgeCount: fixture.summary.edgeCount,
    hash: fixture.fixtureHash,
  };
}

function sampleStatistics(values: readonly number[]): SampleStatistics {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.length <= 1
    ? 0
    : values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
  const standardDeviation = Math.sqrt(variance);
  return {
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    standardDeviation,
    coefficientOfVariation: mean === 0 ? null : standardDeviation / Math.abs(mean),
  };
}

function metricDeltas(
  current: BenchmarkAverages,
  baseline: BenchmarkAverages,
): BenchmarkAverages {
  return {
    dragFps: current.dragFps - baseline.dragFps,
    settleTimeMs: current.settleTimeMs - baseline.settleTimeMs,
    idleCpuPct: current.idleCpuPct - baseline.idleCpuPct,
    heapAfterLoadBytes: current.heapAfterLoadBytes - baseline.heapAfterLoadBytes,
    processAfterLoadBytes: current.processAfterLoadBytes - baseline.processAfterLoadBytes,
    memoryAfterCyclesBytes: current.memoryAfterCyclesBytes - baseline.memoryAfterCyclesBytes,
  };
}

function validateBaseline(options: {
  baseline: AggregateGraphBenchmarkReport;
  fixture: FixtureIdentity;
  configuration: BenchmarkConfiguration;
  environment: BenchmarkEnvironment;
}): void {
  if (options.baseline.renderer !== 'current') {
    throw new Error('Baseline report must measure the current renderer');
  }
  if (options.baseline.source.dirty) {
    throw new Error('Baseline report must come from a clean source revision');
  }
  if (options.baseline.runCount !== options.baseline.configuration.runCount
    || options.baseline.runs.length !== options.baseline.runCount) {
    throw new Error('Baseline report run count is internally inconsistent');
  }
  if (options.baseline.runs.some(run =>
    run.metrics.drag.draggedNodeId !== options.baseline.configuration.targetNodeId)) {
    throw new Error('Baseline report drag target is internally inconsistent');
  }
  if (!isDeepStrictEqual(options.baseline.fixture, options.fixture)) {
    throw new Error('Baseline fixture identity does not match the candidate');
  }
  if (!isDeepStrictEqual(options.baseline.configuration, options.configuration)) {
    throw new Error('Baseline benchmark configuration does not match the candidate');
  }
  if (!isDeepStrictEqual(options.baseline.environment, options.environment)) {
    throw new Error('Baseline benchmark environment does not match the candidate');
  }
}

export function createAggregateBenchmarkReport(options: {
  fixture: BenchmarkFixture;
  renderer: BenchmarkRenderer;
  runs: CompletedBenchmarkRun[];
  environment: BenchmarkEnvironment;
  configuration: BenchmarkConfiguration;
  source: BenchmarkSource;
  baseline?: { path: string; report: AggregateGraphBenchmarkReport };
}): AggregateGraphBenchmarkReport {
  if (options.runs.length < 3) {
    throw new Error('Aggregate reports require at least 3 complete benchmark runs');
  }
  if (options.configuration.runCount !== options.runs.length) {
    throw new Error('Benchmark configuration run count does not match completed runs');
  }
  if (!options.baseline && options.renderer !== 'current') {
    throw new Error('Candidate renderer reports require a baseline report');
  }
  if (options.runs.some(run => run.metrics.drag.draggedNodeId !== options.configuration.targetNodeId)) {
    throw new Error('Completed run drag target does not match benchmark configuration');
  }

  const finalCycleMemory = options.runs.map((run) => {
    const samples = run.metrics.memory.afterCloseCycleBytes;
    const finalSample = samples[samples.length - 1];
    if (!Number.isFinite(finalSample)) throw new Error('Completed run has no final memory-cycle sample');
    return finalSample;
  });
  const sampleSets: Record<keyof BenchmarkAverages, number[]> = {
    dragFps: options.runs.map(run => run.metrics.drag.fps),
    settleTimeMs: options.runs.map(run => run.metrics.settleTimeMs),
    idleCpuPct: options.runs.map(run => run.metrics.idleCpuPct),
    heapAfterLoadBytes: options.runs.map(run => run.metrics.memory.heapAfterLoadBytes),
    processAfterLoadBytes: options.runs.map(run => run.metrics.memory.processAfterLoadBytes),
    memoryAfterCyclesBytes: finalCycleMemory,
  };
  const statistics = Object.fromEntries(
    Object.entries(sampleSets).map(([name, values]) => [name, sampleStatistics(values)]),
  ) as Record<keyof BenchmarkAverages, SampleStatistics>;
  const averages: BenchmarkAverages = {
    dragFps: statistics.dragFps.mean,
    settleTimeMs: statistics.settleTimeMs.mean,
    idleCpuPct: statistics.idleCpuPct.mean,
    heapAfterLoadBytes: statistics.heapAfterLoadBytes.mean,
    processAfterLoadBytes: statistics.processAfterLoadBytes.mean,
    memoryAfterCyclesBytes: statistics.memoryAfterCyclesBytes.mean,
  };
  const unstableMetrics = (Object.keys(statistics) as Array<keyof BenchmarkAverages>)
    .filter(name => (statistics[name].coefficientOfVariation ?? 0) > 0.1);
  const memoryPlateau = assessMemoryPlateau(
    options.runs.flatMap(run => run.metrics.memory.afterCloseCycleBytes),
  );
  const validRuns = options.runs.every(run =>
    run.metrics.drag.responsive
    && run.metrics.drag.finitePositions
    && run.metrics.drag.settledCollisionViolationCount === 0
    && run.metrics.drag.releasedCollisionViolationCount === 0,
  );
  const tierPassed = memoryPlateau.plateau && validRuns && averages.dragFps >= 30;
  const identity = fixtureIdentity(options.fixture);
  if (options.baseline) {
    validateBaseline({
      baseline: options.baseline.report,
      fixture: identity,
      configuration: options.configuration,
      environment: options.environment,
    });
  }
  const baselineAverages = options.baseline?.report.averages ?? averages;

  return {
    schemaVersion: 2,
    status: 'complete',
    renderer: options.renderer,
    fixture: identity,
    runCount: options.runs.length,
    averages,
    statistics,
    unstableMetrics,
    memoryPlateau,
    tierPassed,
    configuration: options.configuration,
    source: options.source,
    baseline: {
      kind: options.baseline ? 'report' : 'self',
      ...(options.baseline ? { path: options.baseline.path } : {}),
      revision: options.baseline?.report.source.revision ?? options.source.revision,
      deltas: metricDeltas(averages, baselineAverages),
    },
    runs: options.runs,
    environment: options.environment,
  };
}

export function createFailedAggregateBenchmarkReport(options: {
  fixture: BenchmarkFixture;
  renderer: BenchmarkRenderer;
  configuration: BenchmarkConfiguration;
  source: BenchmarkSource;
  runs: CompletedBenchmarkRun[];
  environment: BenchmarkEnvironment;
  stage: string;
  message: string;
  timedOut: boolean;
}): FailedAggregateGraphBenchmarkReport {
  return {
    schemaVersion: 2,
    status: options.timedOut ? 'timeout' : 'failed',
    renderer: options.renderer,
    fixture: fixtureIdentity(options.fixture),
    configuration: options.configuration,
    source: options.source,
    runs: options.runs,
    error: {
      stage: options.stage,
      message: options.message,
    },
    environment: options.environment,
  };
}

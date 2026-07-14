import { isDeepStrictEqual } from 'node:util';

import type { BenchmarkRenderer } from '../cli/arguments';
import type { BenchmarkFixture } from '../fixture/presets';
import type {
  InteractionAssessment,
  InteractionThresholds,
} from '../metrics/interaction';
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
  mean: number;
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
      releaseObservationMs: number;
      settledAfterRelease: boolean;
      interactionAssessment: InteractionAssessment;
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
  scenarioId: 'synthetic-node-drag-v4';
  pathId: 'centered-node-sine-v2';
  targetNodeId: string;
  neighborNodeIds: string[];
  interactionThresholds: InteractionThresholds;
  releaseObservationMs: number;
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
  cpuFrameTimeMs: number;
  cpuFrameP95Ms: number;
  cpuFrameOnePercentHighMs: number;
  cpuFrameMaxMs: number;
  displayedFps: number;
  dragFps: number;
  frozenFrameCount: number;
  hudDifferenceMaxPct: number;
  neighborLatencyFrames: number;
  potentialFps: number;
  renderMs: number;
  settleEnvelopeViolationCount: number;
  simulationMs: number;
  targetLatencyFrames: number;
  teleportFrameCount: number;
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
  schemaVersion: 3;
  status: 'complete';
  renderer: BenchmarkRenderer;
  fixture: FixtureIdentity;
  runCount: number;
  averages: BenchmarkAverages;
  statistics: Record<keyof BenchmarkAverages, SampleStatistics>;
  unstableMetrics: Array<keyof BenchmarkAverages>;
  memoryPlateau: MemoryPlateauAssessment | null;
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
  schemaVersion: 3;
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
  return Object.fromEntries(
    (Object.keys(current) as Array<keyof BenchmarkAverages>)
      .map(name => [name, current[name] - baseline[name]]),
  ) as unknown as BenchmarkAverages;
}

function requiredLatency(value: number | null): number {
  return value ?? Number.MAX_SAFE_INTEGER;
}

function maximumHudDifference(assessment: InteractionAssessment): number {
  const differences = assessment.hudAgreement?.differencesPct;
  if (!differences) return Number.MAX_SAFE_INTEGER;
  const values = Object.values(differences);
  if (values.some(value => value === null || !Number.isFinite(value))) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(...values as number[]);
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
    if (options.configuration.memoryCycles === 0) {
      return run.metrics.memory.processAfterLoadBytes;
    }
    if (!Number.isFinite(finalSample)) {
      throw new Error('Completed run has no final memory-cycle sample');
    }
    return finalSample;
  });
  const assessments = options.runs.map(run => run.metrics.drag.interactionAssessment);
  const sampleSets: Record<keyof BenchmarkAverages, number[]> = {
    cpuFrameTimeMs: assessments.map(value => value.timing.cpuFrameTimeMs.mean),
    cpuFrameP95Ms: assessments.map(value => value.timing.cpuFrameTimeMs.p95),
    cpuFrameOnePercentHighMs: assessments.map(value => value.timing.cpuFrameTimeMs.p99),
    cpuFrameMaxMs: assessments.map(value => value.timing.cpuFrameTimeMs.max),
    displayedFps: assessments.map(value => value.timing.displayedFps),
    dragFps: options.runs.map(run => run.metrics.drag.fps),
    frozenFrameCount: assessments.map(value => value.interaction.frozenFrameCount),
    hudDifferenceMaxPct: assessments.map(maximumHudDifference),
    neighborLatencyFrames: assessments.map(value => requiredLatency(
      value.interaction.neighborLatencyFrames.maximum,
    )),
    potentialFps: assessments.map(value => value.timing.potentialFps),
    renderMs: assessments.map(value => value.timing.renderMs.mean),
    settleEnvelopeViolationCount: assessments.map(
      value => value.settle.envelopeViolationCount,
    ),
    simulationMs: assessments.map(value => value.timing.simulationMs.mean),
    targetLatencyFrames: assessments.map(value => requiredLatency(
      value.interaction.targetLatencyFrames.maximum,
    )),
    teleportFrameCount: assessments.map(value => value.interaction.teleportFrameCount),
    settleTimeMs: options.runs.map(run => run.metrics.settleTimeMs),
    idleCpuPct: options.runs.map(run => run.metrics.idleCpuPct),
    heapAfterLoadBytes: options.runs.map(run => run.metrics.memory.heapAfterLoadBytes),
    processAfterLoadBytes: options.runs.map(run => run.metrics.memory.processAfterLoadBytes),
    memoryAfterCyclesBytes: finalCycleMemory,
  };
  const statistics = Object.fromEntries(
    Object.entries(sampleSets).map(([name, values]) => [name, sampleStatistics(values)]),
  ) as Record<keyof BenchmarkAverages, SampleStatistics>;
  const averages = Object.fromEntries(
    (Object.keys(statistics) as Array<keyof BenchmarkAverages>)
      .map(name => [name, statistics[name].mean]),
  ) as unknown as BenchmarkAverages;
  const unstableMetrics = (Object.keys(statistics) as Array<keyof BenchmarkAverages>)
    .filter(name => (statistics[name].coefficientOfVariation ?? 0) > 0.1);
  const memoryPlateau = options.configuration.memoryCycles === 0
    ? null
    : assessMemoryPlateau(
      options.runs.flatMap(run => run.metrics.memory.afterCloseCycleBytes),
    );
  const validRuns = options.runs.every(run =>
    run.metrics.drag.responsive
    && run.metrics.drag.finitePositions
    && run.metrics.drag.settledAfterRelease
    && run.metrics.drag.interactionAssessment.hudAgreement?.withinTenPercent === true
    && !run.metrics.drag.interactionAssessment.truncated
    && run.metrics.drag.settledCollisionViolationCount === 0
    && run.metrics.drag.releasedCollisionViolationCount === 0,
  );
  const tierPassed = (memoryPlateau?.plateau ?? true)
    && validRuns
    && averages.dragFps >= 30;
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
    schemaVersion: 3,
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
    schemaVersion: 3,
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

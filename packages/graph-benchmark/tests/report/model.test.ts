import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';
import {
  DEFAULT_INTERACTION_THRESHOLDS,
  type InteractionAssessment,
} from '../../src/metrics/interaction';
import {
  createAggregateBenchmarkReport,
  createFailedAggregateBenchmarkReport,
  type AggregateGraphBenchmarkReport,
  type CompletedBenchmarkRun,
} from '../../src/report/model';

const environment = {
  browser: 'chromium',
  browserVersion: '123.0.0',
  cpuModel: 'Apple M4',
  headless: true,
  hostname: 'benchmark-host',
  nodeVersion: 'v22.0.0',
  osRelease: '25.5.0',
  platform: 'darwin-arm64',
};

const targetNodeId = 'packages/package-0000/src/file-000000.ts';
const configuration = {
  scenarioId: 'synthetic-node-drag-v4' as const,
  pathId: 'centered-node-sine-v2' as const,
  targetNodeId,
  neighborNodeIds: ['neighbor'],
  interactionThresholds: { ...DEFAULT_INTERACTION_THRESHOLDS },
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  runCount: 3,
  idleMs: 5_000,
  memoryCycles: 5,
  timeoutMs: 120_000,
};
const source = { revision: 'abc123', dirty: false };

const interactionAssessment = {
  timing: {
    cpuFrameTimeMs: { mean: 5, p50: 5, p95: 6, p99: 7, max: 8, sampleCount: 20 },
    displayedFps: 100,
    potentialFps: 200,
    presentationIntervalMs: null,
    renderMs: { mean: 3, p50: 3, p95: 4, p99: 4, max: 5, sampleCount: 20 },
    simulationMs: { mean: 2, p50: 2, p95: 2, p99: 3, max: 3, sampleCount: 20 },
  },
  interaction: {
    frozenFrameCount: 0,
    maximumJump: 2,
    neighborLatencyFrames: {
      maximum: 2,
      mean: 1.5,
      missedInputCount: 0,
      p95: 2,
      sampleCount: 10,
    },
    targetLatencyFrames: {
      maximum: 1,
      mean: 1,
      missedInputCount: 0,
      p95: 1,
      sampleCount: 10,
    },
    teleportFrameCount: 0,
  },
  settle: {
    durationMs: 100,
    energyAtSleep: 0,
    envelopeViolationCount: 0,
    maximumLateIncreaseRatio: 1,
    monotonicEnvelope: true,
    sleptImperceptibly: true,
  },
  hudAgreement: {
    differencesPct: {
      displayedFps: 0,
      frameTimeAverage: 0,
      potentialFps: 0,
      renderAverage: 0,
      simulationAverage: 0,
    },
    sampleCount: 20,
    withinTenPercent: true,
  },
  thresholds: { ...DEFAULT_INTERACTION_THRESHOLDS },
  truncated: false,
} as InteractionAssessment;

const frameTimeMs = {
  mean: 16,
  p50: 16,
  p95: 17,
  p99: 20,
  max: 24,
  sampleCount: 120,
  over16ms: 20,
  over33ms: 0,
};

function createRun(run: number, dragFps: number): CompletedBenchmarkRun {
  return {
    run,
    status: 'complete',
    metrics: {
      drag: {
        durationMs: 1_000,
        fps: dragFps,
        frameTimeMs,
        refreshRateHz: 60,
        refreshUtilization: dragFps / 60,
        draggedNodeId: targetNodeId,
        pointerMoves: 60,
        nodeTravelPx: 180,
        responsive: true,
        finitePositions: true,
        settledCollisionViolationCount: 0,
        duringDragCollisionViolationCount: 2,
        releasedCollisionViolationCount: 0,
        interactionAssessment,
      },
      settleTimeMs: 900 + run * 100,
      idleCpuPct: 1 + run,
      memory: {
        heapAfterLoadBytes: 100 + run * 10,
        processAfterLoadBytes: 1_000 + run * 100,
        afterCloseCycleBytes: [
          900 + run,
          902 + run,
          901 + run,
          903 + run,
          902 + run,
        ],
      },
    },
  };
}

function createBaseline(): AggregateGraphBenchmarkReport {
  return createAggregateBenchmarkReport({
    fixture: createSyntheticFixture('500', 307),
    renderer: 'current',
    environment,
    runs: [createRun(1, 30), createRun(2, 36), createRun(3, 42)],
    configuration,
    source,
  });
}

describe('createAggregateBenchmarkReport', () => {
  it('reports arithmetic means, variation, and one aggregate memory plateau', () => {
    const runs = [createRun(1, 30), createRun(2, 36), createRun(3, 42)];
    const report = createAggregateBenchmarkReport({
      fixture: createSyntheticFixture('500', 307),
      renderer: 'current',
      environment,
      runs,
      configuration,
      source,
    });

    expect(report.averages).toEqual({
      cpuFrameTimeMs: 5,
      cpuFrameP95Ms: 6,
      cpuFrameOnePercentHighMs: 7,
      cpuFrameMaxMs: 8,
      displayedFps: 100,
      dragFps: 36,
      frozenFrameCount: 0,
      hudDifferenceMaxPct: 0,
      neighborLatencyFrames: 2,
      potentialFps: 200,
      renderMs: 3,
      settleEnvelopeViolationCount: 0,
      simulationMs: 2,
      targetLatencyFrames: 1,
      teleportFrameCount: 0,
      settleTimeMs: 1_100,
      idleCpuPct: 3,
      heapAfterLoadBytes: 120,
      processAfterLoadBytes: 1_200,
      memoryAfterCyclesBytes: 904,
    });
    expect(report.statistics.dragFps).toEqual({
      mean: 36,
      min: 30,
      max: 42,
      standardDeviation: 6,
      coefficientOfVariation: 1 / 6,
    });
    expect(report.unstableMetrics).toContain('dragFps');
    expect(report.memoryPlateau).toMatchObject({ plateau: true, sampleCount: 15 });
    expect(report.tierPassed).toBe(true);
    expect(report.configuration).toEqual(configuration);
    expect(report.baseline).toMatchObject({
      kind: 'self',
      revision: 'abc123',
      deltas: { dragFps: 0, settleTimeMs: 0, idleCpuPct: 0 },
    });
    expect(report.runs).toEqual(runs);
  });

  it('requires every run to be responsive, finite, collision-free, and on target', () => {
    const fixture = createSyntheticFixture('500', 307);
    const createReport = (run: CompletedBenchmarkRun) => createAggregateBenchmarkReport({
      fixture,
      renderer: 'current' as const,
      environment,
      runs: [run, createRun(2, 36), createRun(3, 42)],
      configuration,
      source,
    });

    const collided = createRun(1, 35);
    collided.metrics.drag.settledCollisionViolationCount = 1;
    expect(createReport(collided).tierPassed).toBe(false);

    const nonfinite = createRun(1, 35);
    nonfinite.metrics.drag.finitePositions = false;
    expect(createReport(nonfinite).tierPassed).toBe(false);

    const wrongTarget = createRun(1, 35);
    wrongTarget.metrics.drag.draggedNodeId = 'another-node';
    expect(() => createReport(wrongTarget)).toThrow('drag target');
  });

  it('validates all comparison-defining baseline identity', () => {
    const fixture = createSyntheticFixture('500', 307);
    const baseline = createBaseline();
    const candidate = (overrides: Partial<Parameters<typeof createAggregateBenchmarkReport>[0]> = {}) =>
      createAggregateBenchmarkReport({
        fixture,
        renderer: 'webgpu',
        environment,
        runs: [createRun(1, 40), createRun(2, 41), createRun(3, 42)],
        configuration,
        source: { revision: 'candidate', dirty: true, diffHash: 'sha256:123' },
        baseline: { path: 'baseline.json', report: baseline },
        ...overrides,
      });

    expect(candidate().baseline.kind).toBe('report');
    expect(() => candidate({ environment: { ...environment, hostname: 'other-host' } }))
      .toThrow('environment');
    expect(() => candidate({ configuration: { ...configuration, targetNodeId: 'other-node' } }))
      .toThrow('configuration');
    expect(() => candidate({ baseline: {
      path: 'baseline.json',
      report: { ...baseline, renderer: 'webgpu' },
    } })).toThrow('current renderer');
    expect(() => candidate({ baseline: {
      path: 'baseline.json',
      report: { ...baseline, source: { ...baseline.source, dirty: true, diffHash: 'sha256:x' } },
    } })).toThrow('clean source');
    expect(() => candidate({ baseline: {
      path: 'baseline.json',
      report: { ...baseline, runCount: 2 },
    } })).toThrow('run count');
  });

  it('refuses incomplete aggregates and candidate reports without a baseline', () => {
    const fixture = createSyntheticFixture('500', 307);
    expect(() => createAggregateBenchmarkReport({
      fixture,
      renderer: 'current',
      environment,
      runs: [],
      configuration,
      source,
    })).toThrow('at least 3 complete benchmark runs');

    expect(() => createAggregateBenchmarkReport({
      fixture,
      renderer: 'webgpu',
      environment,
      runs: [createRun(1, 40), createRun(2, 41), createRun(3, 42)],
      configuration,
      source,
    })).toThrow('require a baseline');
  });
});

describe('createFailedAggregateBenchmarkReport', () => {
  it('preserves completed attempts when a later run fails', () => {
    const report = createFailedAggregateBenchmarkReport({
      fixture: createSyntheticFixture('500', 307),
      renderer: 'current',
      configuration,
      source,
      runs: [],
      environment,
      stage: 'measurement-run-2',
      message: 'drag failed',
      timedOut: false,
    });

    expect(report).toMatchObject({
      schemaVersion: 3,
      status: 'failed',
      configuration,
      source,
      runs: [],
      error: { stage: 'measurement-run-2', message: 'drag failed' },
    });
  });
});

export const OWNED_GRAPH_ATTRIBUTION_STAGES = [
  'frameTotalCpu',
  'physicsStep',
  'workerSimulationCpu',
  'workerRoundTrip',
  'snapshotApply',
  'snapshotNodeSync',
  'interpolatorSample',
  'styleCacheRebuild',
  'geometryRebuild',
  'gpuBufferWrites',
  'gpuEncodeSubmit',
  'canvasPrepare',
  'overlay',
  'pickingHover',
  'reactReconciliation',
  'propsRuntimeReconciliation',
] as const;

export type OwnedGraphAttributionStage =
  typeof OWNED_GRAPH_ATTRIBUTION_STAGES[number];

export type OwnedGraphAttributionScope =
  | 'event'
  | 'frame-cpu'
  | 'host-async-cpu'
  | 'latency'
  | 'worker-cpu';

export type OwnedGraphPhysicsHome = 'main-thread' | 'worker';

const STAGE_SCOPES: Readonly<Record<
  OwnedGraphAttributionStage,
  OwnedGraphAttributionScope
>> = {
  canvasPrepare: 'frame-cpu',
  frameTotalCpu: 'frame-cpu',
  geometryRebuild: 'frame-cpu',
  gpuBufferWrites: 'frame-cpu',
  gpuEncodeSubmit: 'frame-cpu',
  interpolatorSample: 'frame-cpu',
  overlay: 'frame-cpu',
  physicsStep: 'frame-cpu',
  pickingHover: 'event',
  propsRuntimeReconciliation: 'event',
  reactReconciliation: 'event',
  snapshotApply: 'host-async-cpu',
  snapshotNodeSync: 'frame-cpu',
  styleCacheRebuild: 'frame-cpu',
  workerRoundTrip: 'latency',
  workerSimulationCpu: 'worker-cpu',
};

const DEFAULT_MAXIMUM_SAMPLES_PER_STAGE = 4_096;

export interface OwnedGraphStageAttributionSummary {
  scope: OwnedGraphAttributionScope;
  eventCount: number;
  totalMs: number;
  meanEventMs: number;
  p95EventMs: number;
  maximumEventMs: number;
  perRenderedFrameMs: number;
}

export interface OwnedGraphStageAttributionRecording {
  schemaVersion: 1;
  startedAtMs: number;
  endedAtMs: number;
  physicsHome: OwnedGraphPhysicsHome | null;
  renderedFrameCount: number;
  stages: Readonly<Record<
    OwnedGraphAttributionStage,
    Readonly<OwnedGraphStageAttributionSummary>
  >>;
  truncated: boolean;
}

export interface OwnedGraphStageAttributionProfiler {
  active(): boolean;
  finishTiming(stage: OwnedGraphAttributionStage, startedAtMs: number | null): void;
  recordDuration(stage: OwnedGraphAttributionStage, durationMs: number): void;
  recordRenderedFrame(): void;
  setPhysicsHome(home: OwnedGraphPhysicsHome): void;
  start(): void;
  startTiming(): number | null;
  stop(): Readonly<OwnedGraphStageAttributionRecording> | null;
}

export interface OwnedGraphStageAttributionProfilerOptions {
  clock?: () => number;
  maximumSamplesPerStage?: number;
}

interface StageAccumulator {
  eventCount: number;
  maximumMs: number;
  samples: number[];
  totalMs: number;
}

interface ActiveRecording {
  accumulators: Record<OwnedGraphAttributionStage, StageAccumulator>;
  physicsHome: OwnedGraphPhysicsHome | null;
  renderedFrameCount: number;
  startedAtMs: number;
  truncated: boolean;
}

function createAccumulator(): StageAccumulator {
  return {
    eventCount: 0,
    maximumMs: 0,
    samples: [],
    totalMs: 0,
  };
}

function createAccumulators(): Record<OwnedGraphAttributionStage, StageAccumulator> {
  return Object.fromEntries(
    OWNED_GRAPH_ATTRIBUTION_STAGES.map(stage => [stage, createAccumulator()]),
  ) as Record<OwnedGraphAttributionStage, StageAccumulator>;
}

function percentile95(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  const ordered = [...samples].sort((first, second) => first - second);
  return ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)];
}

function freezeSummary(
  scope: OwnedGraphAttributionScope,
  accumulator: StageAccumulator,
  renderedFrameCount: number,
): Readonly<OwnedGraphStageAttributionSummary> {
  return Object.freeze({
    scope,
    eventCount: accumulator.eventCount,
    totalMs: accumulator.totalMs,
    meanEventMs: accumulator.eventCount > 0
      ? accumulator.totalMs / accumulator.eventCount
      : 0,
    p95EventMs: percentile95(accumulator.samples),
    maximumEventMs: accumulator.maximumMs,
    perRenderedFrameMs: renderedFrameCount > 0
      ? accumulator.totalMs / renderedFrameCount
      : 0,
  });
}

export function createOwnedGraphStageAttributionProfiler(
  options: OwnedGraphStageAttributionProfilerOptions = {},
): OwnedGraphStageAttributionProfiler {
  const clock = options.clock ?? (() => performance.now());
  const requestedMaximum = options.maximumSamplesPerStage
    ?? DEFAULT_MAXIMUM_SAMPLES_PER_STAGE;
  const maximumSamplesPerStage = Number.isSafeInteger(requestedMaximum)
    && requestedMaximum > 0
    ? requestedMaximum
    : DEFAULT_MAXIMUM_SAMPLES_PER_STAGE;
  let recording: ActiveRecording | null = null;

  const recordDuration = (
    stage: OwnedGraphAttributionStage,
    durationMs: number,
  ): void => {
    if (!recording || !Number.isFinite(durationMs) || durationMs < 0) return;
    const accumulator = recording.accumulators[stage];
    accumulator.eventCount += 1;
    accumulator.totalMs += durationMs;
    accumulator.maximumMs = Math.max(accumulator.maximumMs, durationMs);
    if (accumulator.samples.length < maximumSamplesPerStage) {
      accumulator.samples.push(durationMs);
    } else {
      recording.truncated = true;
    }
  };

  return {
    active: () => recording !== null,
    finishTiming: (stage, startedAtMs) => {
      if (!recording || startedAtMs === null) return;
      recordDuration(stage, Math.max(0, clock() - startedAtMs));
    },
    recordDuration,
    recordRenderedFrame: () => {
      if (recording) recording.renderedFrameCount += 1;
    },
    setPhysicsHome: (home) => {
      if (recording) recording.physicsHome = home;
    },
    start: () => {
      recording = {
        accumulators: createAccumulators(),
        physicsHome: null,
        renderedFrameCount: 0,
        startedAtMs: clock(),
        truncated: false,
      };
    },
    startTiming: () => recording ? clock() : null,
    stop: () => {
      if (!recording) return null;
      const completed = recording;
      const endedAtMs = clock();
      recording = null;
      const stages = Object.fromEntries(
        OWNED_GRAPH_ATTRIBUTION_STAGES.map(stage => [
          stage,
          freezeSummary(
            STAGE_SCOPES[stage],
            completed.accumulators[stage],
            completed.renderedFrameCount,
          ),
        ]),
      ) as Record<OwnedGraphAttributionStage, Readonly<OwnedGraphStageAttributionSummary>>;
      Object.freeze(stages);
      return Object.freeze({
        schemaVersion: 1 as const,
        startedAtMs: completed.startedAtMs,
        endedAtMs,
        physicsHome: completed.physicsHome,
        renderedFrameCount: completed.renderedFrameCount,
        stages,
        truncated: completed.truncated,
      });
    },
  };
}

export const GRAPH_ATTRIBUTION_STAGES = [
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

export type GraphAttributionStage = typeof GRAPH_ATTRIBUTION_STAGES[number];
export type GraphAttributionScope =
  | 'event'
  | 'frame-cpu'
  | 'host-async-cpu'
  | 'latency'
  | 'worker-cpu';

export interface GraphStageAttributionSummary {
  scope: GraphAttributionScope;
  eventCount: number;
  totalMs: number;
  meanEventMs: number;
  p95EventMs: number;
  maximumEventMs: number;
  perRenderedFrameMs: number;
}

export interface GraphStageAttributionRecording {
  schemaVersion: 1;
  startedAtMs: number;
  endedAtMs: number;
  physicsHome: 'main-thread' | 'worker' | null;
  renderedFrameCount: number;
  stages: Record<GraphAttributionStage, GraphStageAttributionSummary>;
  truncated: boolean;
}

export interface AggregateGraphStageAttribution {
  schemaVersion: 1;
  physicsHome: 'main-thread' | 'worker';
  runCount: number;
  renderedFrameCount: number;
  stages: Record<GraphAttributionStage, GraphStageAttributionSummary & {
    budgetPct: number;
  }>;
  truncated: boolean;
}

export const FRAME_BUDGET_MS = 6.9;

export function aggregateGraphStageAttribution(
  recordings: readonly GraphStageAttributionRecording[],
): AggregateGraphStageAttribution {
  if (recordings.length === 0) {
    throw new Error('Stage attribution requires at least one recording');
  }
  const physicsHome = recordings[0].physicsHome;
  if (!physicsHome || recordings.some(recording => recording.physicsHome !== physicsHome)) {
    throw new Error('Stage attribution recordings must have one identified physics home');
  }
  const renderedFrameCount = recordings.reduce(
    (total, recording) => total + recording.renderedFrameCount,
    0,
  );
  if (renderedFrameCount === 0) {
    throw new Error('Stage attribution recordings contain no rendered frames');
  }
  const stages = Object.fromEntries(GRAPH_ATTRIBUTION_STAGES.map((stage) => {
    const summaries = recordings.map(recording => recording.stages[stage]);
    const scope = summaries[0].scope;
    if (summaries.some(summary => summary.scope !== scope)) {
      throw new Error(`Stage attribution scope mismatch: ${stage}`);
    }
    const eventCount = summaries.reduce((total, summary) => total + summary.eventCount, 0);
    const totalMs = summaries.reduce((total, summary) => total + summary.totalMs, 0);
    const perRenderedFrameMs = totalMs / renderedFrameCount;
    return [stage, {
      scope,
      eventCount,
      totalMs,
      meanEventMs: eventCount > 0 ? totalMs / eventCount : 0,
      p95EventMs: Math.max(...summaries.map(summary => summary.p95EventMs)),
      maximumEventMs: Math.max(...summaries.map(summary => summary.maximumEventMs)),
      perRenderedFrameMs,
      budgetPct: (perRenderedFrameMs / FRAME_BUDGET_MS) * 100,
    }];
  })) as AggregateGraphStageAttribution['stages'];

  return {
    schemaVersion: 1,
    physicsHome,
    runCount: recordings.length,
    renderedFrameCount,
    stages,
    truncated: recordings.some(recording => recording.truncated),
  };
}

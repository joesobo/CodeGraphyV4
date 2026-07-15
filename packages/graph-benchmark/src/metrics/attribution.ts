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

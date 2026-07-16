export interface OwnedGraphFramePerformanceInput {
  presentationTimestampMs: number;
  renderMs: number;
  secondaryRefreshMs?: number;
  simulationMs: number;
}

export interface OwnedGraphActivePerformanceSample {
  status: 'active';
  frameTimeMs: number;
  renderedFps: number;
  sampleCount: number;
  secondaryRefreshMs?: number;
  secondaryRefreshSampleCount?: number;
}

export interface OwnedGraphIdlePerformanceSample {
  status: 'idle';
}

export type OwnedGraphPerformanceSample =
  | OwnedGraphActivePerformanceSample
  | OwnedGraphIdlePerformanceSample;

export interface OwnedGraphPerformanceMonitor {
  completeFrame(submissionId: number): OwnedGraphPerformanceSample | undefined;
  discardFrame(submissionId: number): OwnedGraphPerformanceSample | undefined;
  reset(): void;
  sample(): OwnedGraphPerformanceSample;
  setIdle(): OwnedGraphIdlePerformanceSample;
  stageFrame(submissionId: number, input: OwnedGraphFramePerformanceInput): void;
}

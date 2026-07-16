import type { OwnedGraphFramePerformanceInput } from './types';

export function validFramePerformanceInput(input: OwnedGraphFramePerformanceInput): boolean {
  return Number.isFinite(input.presentationTimestampMs)
    && Number.isFinite(input.renderMs)
    && input.renderMs >= 0
    && (input.secondaryRefreshMs === undefined
      || (Number.isFinite(input.secondaryRefreshMs) && input.secondaryRefreshMs >= 0))
    && Number.isFinite(input.simulationMs)
    && input.simulationMs >= 0;
}

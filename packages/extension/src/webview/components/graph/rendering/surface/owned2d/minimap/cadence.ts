import type { MinimapRefreshInput } from './changes';
import type { MinimapScheduler } from './state';

const MINIMAP_MOVING_REFRESH_INTERVAL_MS = 1000 / 60;
const MINIMAP_MOVING_PROJECTION_INTERVAL_MS = 1000 / 8;
const MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS = 0.5;

export function movingCadenceAllowsRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return !input.moving
    || input.timestampMs + MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS
      >= scheduler.nextMovingRefreshTimestampMs;
}

function advanceMovingRefreshDeadline(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  if (!Number.isFinite(scheduler.nextMovingRefreshTimestampMs)) {
    scheduler.nextMovingRefreshTimestampMs = timestampMs + MINIMAP_MOVING_REFRESH_INTERVAL_MS;
    return;
  }
  const elapsedMs = timestampMs + MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS
    - scheduler.nextMovingRefreshTimestampMs;
  const elapsedIntervals = Math.floor(elapsedMs / MINIMAP_MOVING_REFRESH_INTERVAL_MS) + 1;
  scheduler.nextMovingRefreshTimestampMs += elapsedIntervals * MINIMAP_MOVING_REFRESH_INTERVAL_MS;
}

export function completeMovingCadence(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
  refreshed: boolean,
): void {
  if (!input.moving) {
    scheduler.nextMovingRefreshTimestampMs = Number.NEGATIVE_INFINITY;
    return;
  }
  if (refreshed) advanceMovingRefreshDeadline(scheduler, input.timestampMs);
}

export function movingProjectionCadenceAllowsFit(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return !input.moving
    || input.timestampMs - scheduler.lastProjectionFitTimestampMs
      >= MINIMAP_MOVING_PROJECTION_INTERVAL_MS;
}

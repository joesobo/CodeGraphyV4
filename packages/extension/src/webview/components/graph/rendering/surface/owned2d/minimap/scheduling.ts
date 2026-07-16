import {
  completeMinimapRefresh,
  type MinimapScheduler,
} from './state';
import {
  observeMinimapChanges,
  type MinimapRefreshInput,
} from './changes';

export type { MinimapRefreshInput } from './changes';

const MINIMAP_MOVING_REFRESH_INTERVAL_MS = 1000 / 60;
const MINIMAP_MOVING_PROJECTION_INTERVAL_MS = 1000 / 8;
const MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS = 0.5;

export interface MinimapRefreshDecision {
  fitProjection: boolean;
  refresh: boolean;
  resetBounds: boolean;
  tightenBounds: boolean;
}

function movingCadenceAllowsRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return !input.moving
    || input.timestampMs + MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS
      >= scheduler.nextMovingRefreshTimestampMs;
}

function minimapRefreshNeeded(
  scheduler: MinimapScheduler,
  cadenceAllowsRefresh: boolean,
  settled: boolean,
): boolean {
  return scheduler.dirty && (cadenceAllowsRefresh || settled);
}

function projectionFitNeeded(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
  refresh: boolean,
): boolean {
  return refresh && scheduler.projectionFitPending && (
    !input.moving
    || input.timestampMs - scheduler.lastProjectionFitTimestampMs
      >= MINIMAP_MOVING_PROJECTION_INTERVAL_MS
  );
}

function advanceMovingRefreshDeadline(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  if (!Number.isFinite(scheduler.nextMovingRefreshTimestampMs)) {
    scheduler.nextMovingRefreshTimestampMs = timestampMs + MINIMAP_MOVING_REFRESH_INTERVAL_MS;
    return;
  }
  do {
    scheduler.nextMovingRefreshTimestampMs += MINIMAP_MOVING_REFRESH_INTERVAL_MS;
  } while (
    scheduler.nextMovingRefreshTimestampMs
      <= timestampMs + MINIMAP_REFRESH_TIMESTAMP_TOLERANCE_MS
  );
}

function boundsTighteningNeeded(
  fitProjection: boolean,
  settled: boolean,
  moving: boolean,
): boolean {
  return fitProjection && (settled || !moving);
}

export function scheduleMinimapRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapRefreshDecision {
  const { settled } = observeMinimapChanges(scheduler, input);
  const cadenceAllowsRefresh = movingCadenceAllowsRefresh(scheduler, input);
  const refresh = minimapRefreshNeeded(scheduler, cadenceAllowsRefresh, settled);
  const fitProjection = projectionFitNeeded(scheduler, input, refresh);
  const decision = {
    fitProjection,
    refresh,
    resetBounds: fitProjection && scheduler.pendingBoundsReset,
    tightenBounds: boundsTighteningNeeded(fitProjection, settled, input.moving),
  };
  if (refresh) {
    completeMinimapRefresh(scheduler, input.timestampMs);
    if (input.moving) advanceMovingRefreshDeadline(scheduler, input.timestampMs);
  }
  if (fitProjection) scheduler.lastProjectionFitTimestampMs = input.timestampMs;
  if (decision.resetBounds) scheduler.pendingBoundsReset = false;
  if (fitProjection && !input.moving) scheduler.projectionFitPending = false;
  scheduler.wasMoving = input.moving;
  return decision;
}

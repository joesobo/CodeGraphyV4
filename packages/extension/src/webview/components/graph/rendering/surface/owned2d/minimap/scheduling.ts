import {
  completeMinimapRefresh,
  type MinimapScheduler,
} from './state';

const MINIMAP_MOVING_REFRESH_INTERVAL_MS = 1000 / 8;

export interface MinimapRefreshInput {
  graphIdentity: object;
  moving: boolean;
  positionVersion: number;
  styleVersion: number;
  timestampMs: number;
}

export interface MinimapRefreshDecision {
  refresh: boolean;
  resetBounds: boolean;
  tightenBounds: boolean;
}

function observeMinimapChanges(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): { settled: boolean } {
  const graphChanged = scheduler.graphIdentity !== input.graphIdentity;
  const changed = graphChanged
    || scheduler.positionVersion !== input.positionVersion
    || scheduler.styleVersion !== input.styleVersion;
  const settled = scheduler.wasMoving && !input.moving;
  if (graphChanged) scheduler.pendingBoundsReset = true;
  if (changed || settled) scheduler.dirty = true;
  scheduler.graphIdentity = input.graphIdentity;
  scheduler.positionVersion = input.positionVersion;
  scheduler.styleVersion = input.styleVersion;
  return { settled };
}

function movingCadenceAllowsRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return !input.moving
    || input.timestampMs - scheduler.lastRefreshTimestampMs
      >= MINIMAP_MOVING_REFRESH_INTERVAL_MS;
}

export function scheduleMinimapRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapRefreshDecision {
  const { settled } = observeMinimapChanges(scheduler, input);
  const cadenceAllowsRefresh = movingCadenceAllowsRefresh(scheduler, input);
  const refresh = scheduler.dirty && (cadenceAllowsRefresh || settled);
  const decision = {
    refresh,
    resetBounds: refresh && scheduler.pendingBoundsReset,
    tightenBounds: refresh && settled,
  };
  if (refresh) completeMinimapRefresh(scheduler, input.timestampMs);
  scheduler.wasMoving = input.moving;
  return decision;
}

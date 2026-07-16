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

export interface MinimapScheduler {
  dirty: boolean;
  graphIdentity?: object;
  lastRefreshTimestampMs: number;
  pendingBoundsReset: boolean;
  positionVersion: number;
  styleVersion: number;
  wasMoving: boolean;
}

export function createMinimapScheduler(): MinimapScheduler {
  return {
    dirty: true,
    lastRefreshTimestampMs: Number.NEGATIVE_INFINITY,
    pendingBoundsReset: false,
    positionVersion: -1,
    styleVersion: -1,
    wasMoving: false,
  };
}

export function invalidateMinimapScheduler(scheduler: MinimapScheduler): void {
  scheduler.dirty = true;
  scheduler.lastRefreshTimestampMs = Number.NEGATIVE_INFINITY;
}

export function scheduleMinimapRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapRefreshDecision {
  const graphChanged = scheduler.graphIdentity !== input.graphIdentity;
  const positionsChanged = scheduler.positionVersion !== input.positionVersion;
  const stylesChanged = scheduler.styleVersion !== input.styleVersion;
  const settled = scheduler.wasMoving && !input.moving;
  if (graphChanged) scheduler.pendingBoundsReset = true;
  if (graphChanged || positionsChanged || stylesChanged || settled) scheduler.dirty = true;
  scheduler.graphIdentity = input.graphIdentity;
  scheduler.positionVersion = input.positionVersion;
  scheduler.styleVersion = input.styleVersion;

  const cadenceAllowsRefresh = !input.moving
    || input.timestampMs - scheduler.lastRefreshTimestampMs
      >= MINIMAP_MOVING_REFRESH_INTERVAL_MS;
  const refresh = scheduler.dirty && (cadenceAllowsRefresh || settled);
  const decision = {
    refresh,
    resetBounds: refresh && scheduler.pendingBoundsReset,
    tightenBounds: refresh && settled,
  };
  if (refresh) {
    scheduler.dirty = false;
    scheduler.lastRefreshTimestampMs = input.timestampMs;
    scheduler.pendingBoundsReset = false;
  }
  scheduler.wasMoving = input.moving;
  return decision;
}

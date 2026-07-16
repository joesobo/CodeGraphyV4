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

function completeMinimapRefresh(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  scheduler.dirty = false;
  scheduler.lastRefreshTimestampMs = timestampMs;
  scheduler.pendingBoundsReset = false;
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

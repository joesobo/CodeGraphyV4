export interface MinimapScheduler {
  baseStyleVersion: number;
  devicePixelRatio: number;
  dirty: boolean;
  graphIdentity?: object;
  graphRevision: number;
  graphStyleRevision: number;
  lastRefreshTimestampMs: number;
  pendingBoundsReset: boolean;
  positionVersion: number;
  surfaceHeight: number;
  surfaceWidth: number;
  wasMoving: boolean;
}

export function createMinimapScheduler(): MinimapScheduler {
  return {
    baseStyleVersion: -1,
    devicePixelRatio: -1,
    dirty: true,
    graphRevision: -1,
    graphStyleRevision: -1,
    lastRefreshTimestampMs: Number.NEGATIVE_INFINITY,
    pendingBoundsReset: false,
    positionVersion: -1,
    surfaceHeight: -1,
    surfaceWidth: -1,
    wasMoving: false,
  };
}

export function invalidateMinimapScheduler(scheduler: MinimapScheduler): void {
  scheduler.dirty = true;
  scheduler.lastRefreshTimestampMs = Number.NEGATIVE_INFINITY;
}

export function completeMinimapRefresh(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  scheduler.dirty = false;
  scheduler.lastRefreshTimestampMs = timestampMs;
  scheduler.pendingBoundsReset = false;
}

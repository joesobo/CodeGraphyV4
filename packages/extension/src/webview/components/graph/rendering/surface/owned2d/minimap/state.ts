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

export function completeMinimapRefresh(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  scheduler.dirty = false;
  scheduler.lastRefreshTimestampMs = timestampMs;
  scheduler.pendingBoundsReset = false;
}

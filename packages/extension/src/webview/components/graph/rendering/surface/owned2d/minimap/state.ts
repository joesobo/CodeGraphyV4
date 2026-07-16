export interface MinimapScheduler {
  baseStyleVersion: number;
  devicePixelRatio: number;
  dirty: boolean;
  graphIdentity?: object;
  graphRevision: number;
  graphStyleRevision: number;
  lastRefreshTimestampMs: number;
  pendingBoundsReset: boolean;
  projectionFitPending: boolean;
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
    projectionFitPending: true,
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

export function minimapSettled(wasMoving: boolean, moving: boolean): boolean {
  return wasMoving && !moving;
}

export function minimapPositionChanged(
  scheduler: MinimapScheduler,
  positionVersion: number,
): boolean {
  return scheduler.positionVersion !== positionVersion;
}

type MinimapObservation = Pick<MinimapScheduler,
  | 'baseStyleVersion'
  | 'devicePixelRatio'
  | 'graphIdentity'
  | 'graphRevision'
  | 'graphStyleRevision'
  | 'positionVersion'
  | 'surfaceHeight'
  | 'surfaceWidth'>;

export function recordMinimapObservation(
  scheduler: MinimapScheduler,
  observation: MinimapObservation,
): void {
  scheduler.graphIdentity = observation.graphIdentity;
  scheduler.graphRevision = observation.graphRevision;
  scheduler.devicePixelRatio = observation.devicePixelRatio;
  scheduler.positionVersion = observation.positionVersion;
  scheduler.baseStyleVersion = observation.baseStyleVersion;
  scheduler.graphStyleRevision = observation.graphStyleRevision;
  scheduler.surfaceHeight = observation.surfaceHeight;
  scheduler.surfaceWidth = observation.surfaceWidth;
}

export function completeMinimapRefresh(
  scheduler: MinimapScheduler,
  timestampMs: number,
): void {
  scheduler.dirty = false;
  scheduler.lastRefreshTimestampMs = timestampMs;
  scheduler.pendingBoundsReset = false;
}

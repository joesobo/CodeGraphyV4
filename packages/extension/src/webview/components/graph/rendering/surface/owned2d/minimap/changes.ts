import type { MinimapScheduler } from './state';

export interface MinimapRefreshInput {
  devicePixelRatio: number;
  graphIdentity: object;
  graphRevision: number;
  moving: boolean;
  positionVersion: number;
  styleVersion: number;
  surfaceHeight: number;
  surfaceWidth: number;
  timestampMs: number;
}

export interface MinimapChangeObservation {
  settled: boolean;
}

export function observeMinimapChanges(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapChangeObservation {
  const graphChanged = scheduler.graphIdentity !== input.graphIdentity;
  const membershipChanged = scheduler.graphRevision !== input.graphRevision;
  const surfaceChanged = scheduler.devicePixelRatio !== input.devicePixelRatio
    || scheduler.surfaceHeight !== input.surfaceHeight
    || scheduler.surfaceWidth !== input.surfaceWidth;
  const changed = graphChanged
    || membershipChanged
    || surfaceChanged
    || scheduler.positionVersion !== input.positionVersion
    || scheduler.styleVersion !== input.styleVersion;
  const settled = scheduler.wasMoving && !input.moving;
  if (graphChanged || membershipChanged) scheduler.pendingBoundsReset = true;
  if (changed || settled) scheduler.dirty = true;
  scheduler.graphIdentity = input.graphIdentity;
  scheduler.graphRevision = input.graphRevision;
  scheduler.devicePixelRatio = input.devicePixelRatio;
  scheduler.positionVersion = input.positionVersion;
  scheduler.styleVersion = input.styleVersion;
  scheduler.surfaceHeight = input.surfaceHeight;
  scheduler.surfaceWidth = input.surfaceWidth;
  return { settled };
}

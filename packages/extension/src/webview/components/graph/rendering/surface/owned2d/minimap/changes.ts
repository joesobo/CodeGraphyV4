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

function graphMembershipChanged(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return scheduler.graphIdentity !== input.graphIdentity
    || scheduler.graphRevision !== input.graphRevision;
}

function minimapSurfaceChanged(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return scheduler.devicePixelRatio !== input.devicePixelRatio
    || scheduler.surfaceHeight !== input.surfaceHeight
    || scheduler.surfaceWidth !== input.surfaceWidth;
}

function minimapVisualsChanged(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return scheduler.positionVersion !== input.positionVersion
    || scheduler.styleVersion !== input.styleVersion;
}

export function observeMinimapChanges(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapChangeObservation {
  const membershipChanged = graphMembershipChanged(scheduler, input);
  const changed = membershipChanged
    || minimapSurfaceChanged(scheduler, input)
    || minimapVisualsChanged(scheduler, input);
  const settled = scheduler.wasMoving && !input.moving;
  if (membershipChanged) scheduler.pendingBoundsReset = true;
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

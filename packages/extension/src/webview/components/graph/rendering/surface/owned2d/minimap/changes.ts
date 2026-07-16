import {
  minimapPositionChanged,
  minimapSettled,
  recordMinimapObservation,
  type MinimapScheduler,
} from './state';

export interface MinimapRefreshInput {
  baseStyleVersion: number;
  devicePixelRatio: number;
  graphIdentity: object;
  graphRevision: number;
  graphStyleRevision: number;
  moving: boolean;
  nodeDragActive?: boolean;
  positionVersion: number;
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

function minimapStyleChanged(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return scheduler.baseStyleVersion !== input.baseStyleVersion
    || scheduler.graphStyleRevision !== input.graphStyleRevision;
}

export function observeMinimapChanges(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapChangeObservation {
  const membershipChanged = graphMembershipChanged(scheduler, input);
  const surfaceChanged = minimapSurfaceChanged(scheduler, input);
  const styleChanged = minimapStyleChanged(scheduler, input);
  const positionChanged = minimapPositionChanged(scheduler, input.positionVersion);
  const projectionInputsChanged = membershipChanged || surfaceChanged || styleChanged;
  const changed = projectionInputsChanged || positionChanged;
  const settled = minimapSettled(scheduler.wasMoving, input.moving);
  const nodeDragStarted = input.nodeDragActive === true && !scheduler.nodeDragActive;
  if (membershipChanged) scheduler.pendingBoundsReset = true;
  if (projectionInputsChanged) scheduler.projectionFitPending = true;
  if (nodeDragStarted && !projectionInputsChanged) scheduler.projectionFitPending = false;
  if (changed || settled) scheduler.dirty = true;
  recordMinimapObservation(scheduler, input);
  scheduler.nodeDragActive = input.nodeDragActive === true;
  return { settled };
}

import {
  completeMinimapRefresh,
  type MinimapScheduler,
} from './state';
import {
  observeMinimapChanges,
  type MinimapRefreshInput,
} from './changes';
import {
  completeMovingCadence,
  movingCadenceAllowsRefresh,
  movingProjectionCadenceAllowsFit,
} from './cadence';

export type { MinimapRefreshInput } from './changes';

export interface MinimapRefreshDecision {
  fitProjection: boolean;
  refresh: boolean;
  resetBounds: boolean;
  tightenBounds: boolean;
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
  return refresh && scheduler.projectionFitPending
    && movingProjectionCadenceAllowsFit(scheduler, input);
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
  }
  completeMovingCadence(scheduler, input, refresh);
  if (fitProjection) scheduler.lastProjectionFitTimestampMs = input.timestampMs;
  if (decision.resetBounds) scheduler.pendingBoundsReset = false;
  if (fitProjection && !input.moving) scheduler.projectionFitPending = false;
  scheduler.wasMoving = input.moving;
  return decision;
}

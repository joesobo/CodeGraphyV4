import {
  completeMinimapRefresh,
  type MinimapScheduler,
} from './state';
import {
  observeMinimapChanges,
  type MinimapRefreshInput,
} from './changes';

export type { MinimapRefreshInput } from './changes';

const MINIMAP_MOVING_REFRESH_INTERVAL_MS = 1000 / 8;

export interface MinimapRefreshDecision {
  fitProjection: boolean;
  refresh: boolean;
  resetBounds: boolean;
  tightenBounds: boolean;
}

function movingCadenceAllowsRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): boolean {
  return !input.moving
    || input.timestampMs - scheduler.lastRefreshTimestampMs
      >= MINIMAP_MOVING_REFRESH_INTERVAL_MS;
}

function minimapRefreshNeeded(
  scheduler: MinimapScheduler,
  cadenceAllowsRefresh: boolean,
  settled: boolean,
): boolean {
  return scheduler.dirty && (cadenceAllowsRefresh || settled);
}

function projectionFitNeeded(scheduler: MinimapScheduler, refresh: boolean): boolean {
  return refresh && scheduler.projectionFitPending;
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
  const fitProjection = projectionFitNeeded(scheduler, refresh);
  const decision = {
    fitProjection,
    refresh,
    resetBounds: refresh && scheduler.pendingBoundsReset,
    tightenBounds: boundsTighteningNeeded(fitProjection, settled, input.moving),
  };
  if (refresh) completeMinimapRefresh(scheduler, input.timestampMs);
  if (fitProjection && !input.moving) scheduler.projectionFitPending = false;
  scheduler.wasMoving = input.moving;
  return decision;
}

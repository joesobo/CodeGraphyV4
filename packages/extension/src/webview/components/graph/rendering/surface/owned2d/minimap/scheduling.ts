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

export function scheduleMinimapRefresh(
  scheduler: MinimapScheduler,
  input: MinimapRefreshInput,
): MinimapRefreshDecision {
  const { settled } = observeMinimapChanges(scheduler, input);
  const cadenceAllowsRefresh = movingCadenceAllowsRefresh(scheduler, input);
  const refresh = scheduler.dirty && (cadenceAllowsRefresh || settled);
  const fitProjection = refresh && scheduler.projectionFitPending;
  const decision = {
    fitProjection,
    refresh,
    resetBounds: refresh && scheduler.pendingBoundsReset,
    tightenBounds: fitProjection && (settled || !input.moving),
  };
  if (refresh) completeMinimapRefresh(scheduler, input.timestampMs);
  if (fitProjection && !input.moving) scheduler.projectionFitPending = false;
  scheduler.wasMoving = input.moving;
  return decision;
}

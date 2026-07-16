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
  const decision = {
    refresh,
    resetBounds: refresh && scheduler.pendingBoundsReset,
    tightenBounds: refresh && settled,
  };
  if (refresh) completeMinimapRefresh(scheduler, input.timestampMs);
  scheduler.wasMoving = input.moving;
  return decision;
}

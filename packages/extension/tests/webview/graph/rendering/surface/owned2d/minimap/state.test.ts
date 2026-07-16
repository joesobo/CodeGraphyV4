import { describe, expect, it } from 'vitest';
import {
  completeMinimapRefresh,
  createMinimapScheduler,
  invalidateMinimapScheduler,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/state';

describe('Relationship Graph minimap scheduler state', () => {
  it('starts dirty without stale graph or motion state', () => {
    expect(createMinimapScheduler()).toEqual({
      baseStyleVersion: -1,
      dirty: true,
      devicePixelRatio: -1,
      graphRevision: -1,
      graphStyleRevision: -1,
      lastRefreshTimestampMs: Number.NEGATIVE_INFINITY,
      pendingBoundsReset: false,
      positionVersion: -1,
      surfaceHeight: -1,
      surfaceWidth: -1,
      wasMoving: false,
    });
  });

  it('invalidates the cadence after an external surface change', () => {
    const scheduler = createMinimapScheduler();
    completeMinimapRefresh(scheduler, 50);

    invalidateMinimapScheduler(scheduler);

    expect(scheduler.dirty).toBe(true);
    expect(scheduler.lastRefreshTimestampMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it('records a completed refresh and clears its bounds reset', () => {
    const scheduler = createMinimapScheduler();
    scheduler.pendingBoundsReset = true;

    completeMinimapRefresh(scheduler, 75);

    expect(scheduler.dirty).toBe(false);
    expect(scheduler.lastRefreshTimestampMs).toBe(75);
    expect(scheduler.pendingBoundsReset).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  completeMinimapRefresh,
  createMinimapScheduler,
  invalidateMinimapScheduler,
  minimapPositionChanged,
  minimapSettled,
  recordMinimapObservation,
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
      projectionFitPending: true,
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

  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
  ])('detects whether moving state %s transitioned to %s', (wasMoving, moving, settled) => {
    expect(minimapSettled(wasMoving, moving)).toBe(settled);
  });

  it('detects whether the observed node positions changed', () => {
    const scheduler = createMinimapScheduler();
    scheduler.positionVersion = 4;

    expect(minimapPositionChanged(scheduler, 5)).toBe(true);
    expect(minimapPositionChanged(scheduler, 4)).toBe(false);
  });

  it('records the latest observed graph and surface state', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};

    recordMinimapObservation(scheduler, {
      baseStyleVersion: 1,
      devicePixelRatio: 2,
      graphIdentity,
      graphRevision: 3,
      graphStyleRevision: 4,
      positionVersion: 5,
      surfaceHeight: 140,
      surfaceWidth: 150,
    });

    expect(scheduler).toEqual(expect.objectContaining({
      baseStyleVersion: 1,
      devicePixelRatio: 2,
      graphIdentity,
      graphRevision: 3,
      graphStyleRevision: 4,
      positionVersion: 5,
      surfaceHeight: 140,
      surfaceWidth: 150,
    }));
  });
});

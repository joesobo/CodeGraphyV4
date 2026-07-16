import { describe, expect, it } from 'vitest';
import {
  completeMovingCadence,
  movingCadenceAllowsRefresh,
  movingProjectionCadenceAllowsFit,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/cadence';
import type { MinimapRefreshInput } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/changes';
import { createMinimapScheduler } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/state';

function input(overrides: Partial<MinimapRefreshInput> = {}): MinimapRefreshInput {
  return {
    baseStyleVersion: 1,
    devicePixelRatio: 1,
    graphIdentity: {},
    graphRevision: 1,
    graphStyleRevision: 1,
    moving: true,
    positionVersion: 1,
    surfaceHeight: 160,
    surfaceWidth: 160,
    timestampMs: 0,
    ...overrides,
  };
}

describe('Relationship Graph minimap cadence', () => {
  it('advances a delayed moving deadline in constant-time arithmetic', () => {
    const scheduler = createMinimapScheduler();
    completeMovingCadence(scheduler, input(), true);

    completeMovingCadence(scheduler, input({ timestampMs: 3_600_000 }), true);

    expect(scheduler.nextMovingRefreshTimestampMs).toBeGreaterThan(3_600_000);
    expect(scheduler.nextMovingRefreshTimestampMs).toBeCloseTo(3_600_000 + (1000 / 60));
  });

  it('resets its deadline whenever movement stops', () => {
    const scheduler = createMinimapScheduler();
    completeMovingCadence(scheduler, input(), true);

    completeMovingCadence(scheduler, input({ moving: false, timestampMs: 1 }), true);

    expect(scheduler.nextMovingRefreshTimestampMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it('does not advance its deadline when a moving frame was not repainted', () => {
    const scheduler = createMinimapScheduler();

    completeMovingCadence(scheduler, input(), false);

    expect(scheduler.nextMovingRefreshTimestampMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it('allows refreshes at the deadline within timestamp precision tolerance', () => {
    const scheduler = createMinimapScheduler();
    completeMovingCadence(scheduler, input(), true);

    expect(movingCadenceAllowsRefresh(scheduler, input({
      timestampMs: (1000 / 60) - 0.5,
    }))).toBe(true);
  });

  it('caps moving projection fits separately from repaints', () => {
    const scheduler = createMinimapScheduler();
    scheduler.lastProjectionFitTimestampMs = 0;

    expect(movingProjectionCadenceAllowsFit(scheduler, input({ timestampMs: 17 }))).toBe(false);
    expect(movingProjectionCadenceAllowsFit(scheduler, input({ timestampMs: 125 }))).toBe(true);
  });
});

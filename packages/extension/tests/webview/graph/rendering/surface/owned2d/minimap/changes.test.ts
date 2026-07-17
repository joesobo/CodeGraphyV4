import { describe, expect, it } from 'vitest';
import {
  observeMinimapChanges,
  type MinimapRefreshInput,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/changes';
import { createMinimapScheduler } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/state';

function input(overrides: Partial<MinimapRefreshInput> = {}): MinimapRefreshInput {
  return {
    baseStyleVersion: 1,
    devicePixelRatio: 1,
    graphIdentity: {},
    graphRevision: 1,
    graphStyleRevision: 1,
    moving: false,
    positionVersion: 1,
    surfaceHeight: 160,
    surfaceWidth: 160,
    timestampMs: 0,
    ...overrides,
  };
}

describe('Relationship Graph minimap change observation', () => {
  it('records every observed identity and dimension', () => {
    const scheduler = createMinimapScheduler();
    const observed = input({
      devicePixelRatio: 2,
      graphRevision: 3,
      positionVersion: 4,
      baseStyleVersion: 5,
      surfaceHeight: 140,
      surfaceWidth: 150,
    });

    expect(observeMinimapChanges(scheduler, observed)).toEqual({ settled: false });
    expect(scheduler).toEqual(expect.objectContaining({
      devicePixelRatio: 2,
      dirty: true,
      graphIdentity: observed.graphIdentity,
      graphRevision: 3,
      pendingBoundsReset: true,
      positionVersion: 4,
      baseStyleVersion: 5,
      surfaceHeight: 140,
      surfaceWidth: 150,
    }));
  });

  it.each([
    ['DPR', { devicePixelRatio: 2 }],
    ['height', { surfaceHeight: 159 }],
    ['width', { surfaceWidth: 159 }],
    ['position', { positionVersion: 2 }],
    ['style', { baseStyleVersion: 2 }],
    ['graph style', { graphStyleRevision: 2 }],
  ] as const)('marks a %s-only change dirty without resetting bounds', (_name, change) => {
    const scheduler = createMinimapScheduler();
    const baseline = input();
    observeMinimapChanges(scheduler, baseline);
    scheduler.dirty = false;
    scheduler.pendingBoundsReset = false;

    observeMinimapChanges(scheduler, { ...baseline, ...change });

    expect(scheduler.dirty).toBe(true);
    expect(scheduler.pendingBoundsReset).toBe(false);
  });

  it.each([
    ['graph identity', { graphIdentity: {} }],
    ['membership revision', { graphRevision: 2 }],
  ] as const)('resets bounds for a %s change', (_name, change) => {
    const scheduler = createMinimapScheduler();
    const baseline = input();
    observeMinimapChanges(scheduler, baseline);
    scheduler.dirty = false;
    scheduler.pendingBoundsReset = false;

    observeMinimapChanges(scheduler, { ...baseline, ...change });

    expect(scheduler.dirty).toBe(true);
    expect(scheduler.pendingBoundsReset).toBe(true);
  });

  it('marks a moving-to-settled transition dirty without resetting bounds', () => {
    const scheduler = createMinimapScheduler();
    const baseline = input({ moving: true });
    observeMinimapChanges(scheduler, baseline);
    scheduler.wasMoving = true;
    scheduler.dirty = false;
    scheduler.pendingBoundsReset = false;

    expect(observeMinimapChanges(scheduler, { ...baseline, moving: false }))
      .toEqual({ settled: true });
    expect(scheduler.dirty).toBe(true);
    expect(scheduler.pendingBoundsReset).toBe(false);
  });

  it('keeps an identical stable frame clean', () => {
    const scheduler = createMinimapScheduler();
    const baseline = input();
    observeMinimapChanges(scheduler, baseline);
    scheduler.dirty = false;
    scheduler.pendingBoundsReset = false;

    expect(observeMinimapChanges(scheduler, baseline)).toEqual({ settled: false });
    expect(scheduler.dirty).toBe(false);
    expect(scheduler.pendingBoundsReset).toBe(false);
  });

  it('does not invalidate the settled projection for a position-only change', () => {
    const scheduler = createMinimapScheduler();
    const baseline = input();
    observeMinimapChanges(scheduler, baseline);
    scheduler.dirty = false;
    scheduler.projectionFitPending = false;

    observeMinimapChanges(scheduler, { ...baseline, positionVersion: 2 });

    expect(scheduler.dirty).toBe(true);
    expect(scheduler.projectionFitPending).toBe(false);
  });

  it.each([
    ['base style', { baseStyleVersion: 2 }],
    ['graph style', { graphStyleRevision: 2 }],
  ] as const)('invalidates the settled projection for a %s change', (_name, change) => {
    const scheduler = createMinimapScheduler();
    const baseline = input();
    observeMinimapChanges(scheduler, baseline);
    scheduler.projectionFitPending = false;

    observeMinimapChanges(scheduler, { ...baseline, ...change });

    expect(scheduler.projectionFitPending).toBe(true);
  });
});

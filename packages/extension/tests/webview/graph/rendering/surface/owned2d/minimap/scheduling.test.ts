import { describe, expect, it } from 'vitest';
import { createMinimapScheduler } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/state';
import { scheduleMinimapRefresh } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/scheduling';

describe('Relationship Graph minimap refresh scheduling', () => {
  it.each([60, 120, 144])('averages 60 Hz refreshes on a %i Hz display', (displayHz) => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};

    let refreshes = 0;
    for (let frame = 0; frame < displayHz; frame += 1) {
      const decision = scheduleMinimapRefresh(scheduler, {
        baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
        graphStyleRevision: 1, moving: true, positionVersion: frame + 1,
        surfaceHeight: 160, surfaceWidth: 160, timestampMs: frame * (1000 / displayHz),
      });
      if (decision.refresh) refreshes += 1;
    }

    expect(refreshes).toBeGreaterThanOrEqual(59);
    expect(refreshes).toBeLessThanOrEqual(60);
  });

  it('preserves the ideal moving deadline across delayed frames', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, positionVersion: 2, timestampMs: (1000 / 30) - 0.5,
    }).refresh).toBe(true);
    expect(scheduler.nextMovingRefreshTimestampMs).toBeCloseTo(50);
  });

  it('refreshes at the moving deadline within timestamp precision tolerance', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, positionVersion: 2, timestampMs: (1000 / 60) - 0.5,
    }).refresh).toBe(true);
  });

  it('does not advance the moving deadline for a stable refresh', () => {
    const scheduler = createMinimapScheduler();

    scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    });

    expect(scheduler.nextMovingRefreshTimestampMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it('refreshes immediately when physics settles', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    });

    expect(scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 2,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 1,
    })).toEqual({ fitProjection: true, refresh: true, resetBounds: false, tightenBounds: true });
  });

  it('fits moving projection bounds at 8 Hz while repainting at 60 Hz', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    let projectionFits = 0;
    let refreshes = 0;

    for (let frame = 0; frame < 60; frame += 1) {
      const decision = scheduleMinimapRefresh(scheduler, {
        baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
        graphStyleRevision: 1, moving: true, positionVersion: frame + 1,
        surfaceHeight: 160, surfaceWidth: 160, timestampMs: frame * (1000 / 60),
      });
      if (decision.fitProjection) projectionFits += 1;
      if (decision.refresh) refreshes += 1;
    }

    expect(refreshes).toBeGreaterThanOrEqual(59);
    expect(projectionFits).toBe(8);
  });

  it('refreshes graph and style changes but ignores camera-only frames', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    expect(scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    })).toMatchObject({ fitProjection: true, refresh: true, tightenBounds: true });

    expect(scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 1,
    }).refresh).toBe(false);
    expect(scheduleMinimapRefresh(scheduler, {
      baseStyleVersion: 2, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 2,
    }).refresh).toBe(true);
  });

  it('resets expand-only bounds when stable layout membership changes', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, graphRevision: 2, positionVersion: 2, timestampMs: 125,
    })).toEqual({ fitProjection: true, refresh: true, resetBounds: true, tightenBounds: false });
  });

  it('retains a bounds reset until the moving projection cadence permits a fit', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, graphRevision: 2, positionVersion: 2, timestampMs: 17,
    })).toMatchObject({ fitProjection: false, refresh: true, resetBounds: false });
    expect(scheduler.pendingBoundsReset).toBe(true);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, graphRevision: 2, positionVersion: 3, timestampMs: 125,
    })).toMatchObject({ fitProjection: true, refresh: true, resetBounds: true });
    expect(scheduler.pendingBoundsReset).toBe(false);
  });

  it('refreshes the retained target when DPR or panel dimensions change', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: false, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, devicePixelRatio: 2, timestampMs: 1,
    }).refresh).toBe(true);
    expect(scheduleMinimapRefresh(scheduler, {
      ...input, devicePixelRatio: 2, surfaceHeight: 144, surfaceWidth: 144, timestampMs: 2,
    })).toMatchObject({ fitProjection: true, refresh: true });
  });

  it('keeps the settled fit while repainting user-driven node positions', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      baseStyleVersion: 1, devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1,
      graphStyleRevision: 1, moving: true, positionVersion: 1,
      surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };

    scheduleMinimapRefresh(scheduler, input);
    expect(scheduleMinimapRefresh(scheduler, {
      ...input, moving: false, positionVersion: 2, timestampMs: 10,
    })).toMatchObject({ fitProjection: true, refresh: true, tightenBounds: true });

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, moving: true, positionVersion: 3, timestampMs: 135,
    })).toMatchObject({ fitProjection: false, refresh: true, resetBounds: false });

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, moving: false, positionVersion: 4, timestampMs: 145,
    })).toMatchObject({ fitProjection: false, refresh: true, tightenBounds: false });
  });
});

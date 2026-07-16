import { describe, expect, it } from 'vitest';
import { createMinimapScheduler } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/state';
import { scheduleMinimapRefresh } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/scheduling';

describe('Relationship Graph minimap refresh scheduling', () => {
  it('caps moving refreshes at 8 Hz and refreshes immediately when physics settles', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};

    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: true,
      positionVersion: 1, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    })).toEqual({ refresh: true, resetBounds: true, tightenBounds: false });
    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: true,
      positionVersion: 2, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 100,
    }).refresh).toBe(false);
    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: true,
      positionVersion: 3, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 125,
    }).refresh).toBe(true);
    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: false,
      positionVersion: 4, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 130,
    })).toEqual({ refresh: true, resetBounds: false, tightenBounds: true });
  });

  it('refreshes graph and style changes but ignores camera-only frames', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: false,
      positionVersion: 1, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    });

    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: false,
      positionVersion: 1, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 1,
    }).refresh).toBe(false);
    expect(scheduleMinimapRefresh(scheduler, {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: false,
      positionVersion: 1, styleVersion: 2, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 2,
    }).refresh).toBe(true);
  });

  it('resets expand-only bounds when stable layout membership changes', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    const input = {
      devicePixelRatio: 1, graphIdentity, graphRevision: 1, moving: true,
      positionVersion: 1, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, graphRevision: 2, positionVersion: 2, timestampMs: 125,
    })).toEqual({ refresh: true, resetBounds: true, tightenBounds: false });
  });

  it('refreshes the retained target when DPR or panel dimensions change', () => {
    const scheduler = createMinimapScheduler();
    const input = {
      devicePixelRatio: 1, graphIdentity: {}, graphRevision: 1, moving: false,
      positionVersion: 1, styleVersion: 1, surfaceHeight: 160, surfaceWidth: 160, timestampMs: 0,
    };
    scheduleMinimapRefresh(scheduler, input);

    expect(scheduleMinimapRefresh(scheduler, {
      ...input, devicePixelRatio: 2, timestampMs: 1,
    }).refresh).toBe(true);
    expect(scheduleMinimapRefresh(scheduler, {
      ...input, devicePixelRatio: 2, surfaceHeight: 144, surfaceWidth: 144, timestampMs: 2,
    }).refresh).toBe(true);
  });
});

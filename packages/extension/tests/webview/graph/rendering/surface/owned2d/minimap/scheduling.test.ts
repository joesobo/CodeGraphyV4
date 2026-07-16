import { describe, expect, it } from 'vitest';
import {
  createMinimapScheduler,
  scheduleMinimapRefresh,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/scheduling';

describe('Relationship Graph minimap refresh scheduling', () => {
  it('caps moving refreshes at 8 Hz and refreshes immediately when physics settles', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};

    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: true, positionVersion: 1, styleVersion: 1, timestampMs: 0,
    })).toEqual({ refresh: true, resetBounds: true, tightenBounds: false });
    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: true, positionVersion: 2, styleVersion: 1, timestampMs: 100,
    }).refresh).toBe(false);
    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: true, positionVersion: 3, styleVersion: 1, timestampMs: 125,
    }).refresh).toBe(true);
    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: false, positionVersion: 4, styleVersion: 1, timestampMs: 130,
    })).toEqual({ refresh: true, resetBounds: false, tightenBounds: true });
  });

  it('refreshes graph and style changes but ignores camera-only frames', () => {
    const scheduler = createMinimapScheduler();
    const graphIdentity = {};
    scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: false, positionVersion: 1, styleVersion: 1, timestampMs: 0,
    });

    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: false, positionVersion: 1, styleVersion: 1, timestampMs: 1,
    }).refresh).toBe(false);
    expect(scheduleMinimapRefresh(scheduler, {
      graphIdentity, moving: false, positionVersion: 1, styleVersion: 2, timestampMs: 2,
    }).refresh).toBe(true);
  });
});

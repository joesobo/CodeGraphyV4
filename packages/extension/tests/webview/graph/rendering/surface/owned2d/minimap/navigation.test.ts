import { describe, expect, it } from 'vitest';
import {
  beginMinimapNavigation,
  moveMinimapNavigation,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/navigation';

const projection = { centerX: 0, centerY: 0, padding: 12, size: 160, zoom: 1 };
const viewport = { box: { height: 40, width: 40, x: 60, y: 60 }, indicator: null };

describe('Relationship Graph minimap navigation', () => {
  it('preserves the grab offset when dragging the viewport box', () => {
    const start = beginMinimapNavigation({
      camera: { centerX: 5, centerY: -10, zoom: 2 },
      panelPoint: { x: 70, y: 75 },
      pointerId: 3,
      projection,
      viewport,
    });

    expect(start.cameraCenter).toEqual({ x: 5, y: -10 });
    expect(start.session.grabOffset).toEqual({ x: -15, y: 5 });
    expect(moveMinimapNavigation(start.session, projection, { x: 90, y: 85 }))
      .toEqual({ x: 25, y: 0 });
  });

  it('treats every viewport edge as part of the draggable box', () => {
    for (const panelPoint of [
      { x: 60, y: 80 },
      { x: 100, y: 80 },
      { x: 80, y: 60 },
      { x: 80, y: 100 },
    ]) {
      expect(beginMinimapNavigation({
        camera: { centerX: 5, centerY: -10, zoom: 2 },
        panelPoint,
        pointerId: 3,
        projection,
        viewport,
      }).cameraCenter).toEqual({ x: 5, y: -10 });
    }
  });

  it('centers beneath pointers outside each viewport boundary', () => {
    for (const panelPoint of [
      { x: 59, y: 80 },
      { x: 101, y: 80 },
      { x: 80, y: 59 },
      { x: 80, y: 101 },
    ]) {
      expect(beginMinimapNavigation({
        camera: { centerX: 5, centerY: -10, zoom: 2 },
        panelPoint,
        pointerId: 4,
        projection,
        viewport,
      }).cameraCenter).toEqual({
        x: panelPoint.x - 80,
        y: panelPoint.y - 80,
      });
    }
  });

  it('centers beneath the pointer when there is no visible viewport box', () => {
    expect(beginMinimapNavigation({
      camera: { centerX: 5, centerY: -10, zoom: 2 },
      panelPoint: { x: 120, y: 40 },
      pointerId: 4,
      projection,
      viewport: { box: null, indicator: { angle: 0, x: 148, y: 80 } },
    }).session.grabOffset).toEqual({ x: 0, y: 0 });
  });
});

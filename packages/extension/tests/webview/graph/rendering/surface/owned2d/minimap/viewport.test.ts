import { describe, expect, it } from 'vitest';
import { projectMinimapViewport } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/viewport';

const minimap = { centerX: 0, centerY: 0, padding: 12, size: 160, zoom: 1 };

describe('Relationship Graph minimap viewport projection', () => {
  it('moves with camera pan and shrinks with camera zoom', () => {
    expect(projectMinimapViewport(minimap, {
      camera: { centerX: 10, centerY: 20, zoom: 2 },
      viewportHeight: 80,
      viewportWidth: 100,
    }).box).toEqual({ height: 40, width: 50, x: 65, y: 40 });
  });

  it('clips a partial viewport to the panel', () => {
    expect(projectMinimapViewport(minimap, {
      camera: { centerX: 140, centerY: 0, zoom: 1 },
      viewportHeight: 40,
      viewportWidth: 160,
    }).box).toEqual({ height: 40, width: 20, x: 140, y: 60 });
  });

  it('uses an inset direction indicator when the camera is fully off-map', () => {
    const viewport = projectMinimapViewport(minimap, {
      camera: { centerX: 300, centerY: 0, zoom: 1 },
      viewportHeight: 40,
      viewportWidth: 40,
    });

    expect(viewport.box).toBeNull();
    expect(viewport.indicator).toEqual({ angle: 0, x: 148, y: 80 });
  });
});

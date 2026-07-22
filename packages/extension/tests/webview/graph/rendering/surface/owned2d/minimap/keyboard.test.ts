import { describe, expect, it } from 'vitest';
import { keyboardMinimapCameraCenter } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/keyboard';

describe('Relationship Graph minimap keyboard navigation', () => {
  it('pans by one tenth of the visible graph area', () => {
    const camera = { centerX: 20, centerY: -10, zoom: 2 };

    expect(keyboardMinimapCameraCenter('ArrowRight', camera, 1_000, 600, false))
      .toEqual({ x: 70, y: -10 });
    expect(keyboardMinimapCameraCenter('ArrowLeft', camera, 1_000, 600, false))
      .toEqual({ x: -30, y: -10 });
    expect(keyboardMinimapCameraCenter('ArrowUp', camera, 1_000, 600, false))
      .toEqual({ x: 20, y: -40 });
  });

  it('accelerates arrow-key panning while Shift is held', () => {
    expect(keyboardMinimapCameraCenter(
      'ArrowDown', { centerX: 0, centerY: 0, zoom: 2 }, 1_000, 600, true,
    )).toEqual({ x: 0, y: 150 });
    expect(keyboardMinimapCameraCenter(
      'ArrowRight', { centerX: 0, centerY: 0, zoom: 2 }, 1_000, 600, true,
    )).toEqual({ x: 250, y: 0 });
  });

  it('ignores keys that do not pan the graph', () => {
    expect(keyboardMinimapCameraCenter(
      'Enter', { centerX: 0, centerY: 0, zoom: 1 }, 1_000, 600, false,
    )).toBeUndefined();
  });
});

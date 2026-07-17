import { describe, expect, it, vi } from 'vitest';
import { createMinimapInteractionHandlers } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/interaction';

describe('Relationship Graph minimap interaction handlers', () => {
  it('suppresses context menus and wheel input', () => {
    const handlers = createMinimapInteractionHandlers({
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      clearHover: vi.fn(),
      mainCanvasRef: { current: null },
      projectionRef: { current: null },
      requestFrame: vi.fn(),
      sessionRef: { current: null },
    });
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    handlers.onContextMenu(event as never);
    handlers.onWheel(event as never);

    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
  });
});

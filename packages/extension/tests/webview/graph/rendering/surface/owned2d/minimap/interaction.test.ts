import { describe, expect, it, vi } from 'vitest';
import {
  beginMinimapNavigation,
  createMinimapInteractionHandlers,
  moveMinimapNavigation,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/interaction';

const projection = { centerX: 0, centerY: 0, padding: 12, size: 160, zoom: 1 };
const viewport = { box: { height: 40, width: 40, x: 60, y: 60 }, indicator: null };

describe('Relationship Graph minimap navigation', () => {
  it('preserves the grab offset when dragging the viewport box', () => {
    const start = beginMinimapNavigation({
      camera: { centerX: 0, centerY: 0, zoom: 2 },
      panelPoint: { x: 70, y: 75 },
      pointerId: 3,
      projection,
      viewport,
    });

    expect(start.cameraCenter).toEqual({ x: 0, y: 0 });
    expect(moveMinimapNavigation(start.session, projection, { x: 90, y: 85 }))
      .toEqual({ x: 20, y: -10 });
  });

  it('centers beneath a pointer that starts outside the viewport box', () => {
    const start = beginMinimapNavigation({
      camera: { centerX: 0, centerY: 0, zoom: 2 },
      panelPoint: { x: 120, y: 40 },
      pointerId: 4,
      projection,
      viewport,
    });

    expect(start.cameraCenter).toEqual({ x: 40, y: 40 });
    expect(start.session.grabOffset).toEqual({ x: 0, y: 0 });
  });

  it('captures navigation without changing zoom and cancels it with Escape', () => {
    const camera = { centerX: 0, centerY: 0, zoom: 2 };
    const panel = {
      focus: vi.fn(),
      getBoundingClientRect: () => ({ height: 160, left: 0, top: 0, width: 160 }),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    } as unknown as HTMLDivElement;
    const runtime = {
      cameraRef: { current: camera },
      clearHover: vi.fn(),
      mainCanvasRef: { current: {
        getBoundingClientRect: () => ({ height: 40, width: 40 }),
      } as HTMLCanvasElement },
      projectionRef: { current: projection },
      requestFrame: vi.fn(),
      sessionRef: { current: null },
    };
    const handlers = createMinimapInteractionHandlers(runtime);
    const suppress = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    handlers.onPointerDown({
      ...suppress,
      button: 0,
      clientX: 120,
      clientY: 40,
      currentTarget: panel,
      pointerId: 7,
    } as never);

    expect(camera).toEqual({ centerX: 40, centerY: 40, transition: null, zoom: 2 });
    expect(panel.setPointerCapture).toHaveBeenCalledWith(7);
    expect(runtime.sessionRef.current).not.toBeNull();

    handlers.onKeyDown({
      ...suppress,
      currentTarget: panel,
      key: 'Escape',
    } as never);
    expect(runtime.sessionRef.current).toBeNull();
    expect(panel.releasePointerCapture).toHaveBeenCalledWith(7);
  });
});

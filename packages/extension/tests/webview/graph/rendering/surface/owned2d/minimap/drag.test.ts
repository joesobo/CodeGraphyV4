import { describe, expect, it, vi } from 'vitest';
import {
  createMinimapInteractionHandlers,
  type MinimapInteractionRuntime,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/interaction';

function createRuntime() {
  const camera = { centerX: 0, centerY: 0, zoom: 2 };
  const panel = {
    focus: vi.fn(),
    getBoundingClientRect: () => ({ height: 80, left: 10, top: 20, width: 80 }),
    setPointerCapture: vi.fn(),
  } as unknown as HTMLDivElement;
  const runtime: MinimapInteractionRuntime = {
    cameraRef: { current: camera },
    clearHover: vi.fn(),
    mainCanvasRef: { current: {
      getBoundingClientRect: () => ({ height: 80, width: 100 }),
    } as HTMLCanvasElement },
    projectionRef: { current: {
      centerX: 0, centerY: 0, padding: 12, size: 160, zoom: 1,
    } },
    requestFrame: vi.fn(),
    sessionRef: { current: null },
  };
  return { camera, panel, runtime };
}

describe('Relationship Graph minimap drag', () => {
  it('captures and moves navigation without changing zoom', () => {
    const { camera, panel, runtime } = createRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);
    const suppress = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    handlers.onPointerDown({
      ...suppress,
      button: 0,
      clientX: 70,
      clientY: 40,
      currentTarget: panel,
      pointerId: 7,
    } as never);

    expect(camera).toEqual({ centerX: 40, centerY: -40, transition: null, zoom: 2 });
    expect(panel.setPointerCapture).toHaveBeenCalledWith(7);
    expect(panel.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(runtime.clearHover).toHaveBeenCalledOnce();

    handlers.onPointerMove({
      ...suppress,
      clientX: 75,
      clientY: 35,
      currentTarget: panel,
      pointerId: 7,
    } as never);

    expect(camera).toEqual({ centerX: 50, centerY: -50, transition: null, zoom: 2 });
    expect(runtime.requestFrame).toHaveBeenCalledTimes(2);
    expect(suppress.preventDefault).toHaveBeenCalledTimes(2);
    expect(suppress.stopPropagation).toHaveBeenCalledTimes(2);
  });

  it('ignores unavailable surfaces, non-primary input, and unowned movement', () => {
    const { panel, runtime } = createRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);
    const event = {
      button: 1,
      clientX: 70,
      clientY: 40,
      currentTarget: panel,
      pointerId: 7,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handlers.onPointerDown(event as never);
    handlers.onPointerMove(event as never);
    runtime.projectionRef.current = null;
    handlers.onPointerDown({ ...event, button: 0 } as never);
    runtime.projectionRef.current = {
      centerX: 0, centerY: 0, padding: 12, size: 160, zoom: 1,
    };
    runtime.mainCanvasRef.current = null;
    handlers.onPointerDown({ ...event, button: 0 } as never);

    expect(runtime.requestFrame).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

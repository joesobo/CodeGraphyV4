import { describe, expect, it, vi } from 'vitest';
import {
  createMinimapInteractionHandlers,
  type MinimapInteractionRuntime,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/interaction';

function createEventRuntime() {
  const panel = {
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLDivElement;
  const runtime: MinimapInteractionRuntime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    clearHover: vi.fn(),
    mainCanvasRef: { current: null },
    projectionRef: { current: null },
    requestFrame: vi.fn(),
    sessionRef: { current: { grabOffset: { x: 0, y: 0 }, pointerId: 7 } },
  };
  return { panel, runtime };
}

describe('Relationship Graph minimap pointer events', () => {
  it('ends the matching session with Escape', () => {
    const { panel, runtime } = createEventRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);
    const event = {
      currentTarget: panel,
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handlers.onKeyDown(event as never);

    expect(runtime.sessionRef.current).toBeNull();
    expect(panel.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it('ignores unrelated keys and Escape without a session', () => {
    const { panel, runtime } = createEventRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);
    const event = {
      currentTarget: panel,
      key: 'Enter',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handlers.onKeyDown(event as never);
    runtime.sessionRef.current = null;
    handlers.onKeyDown({ ...event, key: 'Escape' } as never);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(panel.releasePointerCapture).not.toHaveBeenCalled();
  });

  it('clears only the session whose pointer capture was lost', () => {
    const { panel, runtime } = createEventRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);

    handlers.onLostPointerCapture({ currentTarget: panel, pointerId: 8 } as never);
    expect(runtime.sessionRef.current).not.toBeNull();
    handlers.onLostPointerCapture({ currentTarget: panel, pointerId: 7 } as never);
    expect(runtime.sessionRef.current).toBeNull();
    expect(() => handlers.onLostPointerCapture({
      currentTarget: panel, pointerId: 7,
    } as never)).not.toThrow();
  });

  it('ends matching pointer-up and cancel sessions while suppressing input', () => {
    const { panel, runtime } = createEventRuntime();
    const handlers = createMinimapInteractionHandlers(runtime);
    const event = {
      currentTarget: panel,
      pointerId: 8,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handlers.onPointerUp(event as never);
    expect(event.preventDefault).not.toHaveBeenCalled();
    handlers.onPointerCancel(event as never);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(runtime.sessionRef.current).not.toBeNull();
    handlers.onPointerUp({ ...event, pointerId: 7 } as never);
    expect(runtime.sessionRef.current).toBeNull();
    expect(panel.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(() => handlers.onPointerUp({ ...event, pointerId: 7 } as never)).not.toThrow();
    expect(() => handlers.onPointerCancel({ ...event, pointerId: 7 } as never)).not.toThrow();
  });

  it('ends a session safely when pointer capture is absent or no longer held', () => {
    const { runtime } = createEventRuntime();
    const panelWithoutCapture = {
      releasePointerCapture: vi.fn(),
    } as unknown as HTMLDivElement;
    const handlers = createMinimapInteractionHandlers(runtime);
    const event = {
      currentTarget: panelWithoutCapture,
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    expect(() => handlers.onKeyDown(event as never)).not.toThrow();
    expect(panelWithoutCapture.releasePointerCapture).not.toHaveBeenCalled();

    const panelNotHoldingCapture = {
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    } as unknown as HTMLDivElement;
    runtime.sessionRef.current = { grabOffset: { x: 0, y: 0 }, pointerId: 7 };
    handlers.onKeyDown({ ...event, currentTarget: panelNotHoldingCapture } as never);
    expect(panelNotHoldingCapture.releasePointerCapture).not.toHaveBeenCalled();
  });
});

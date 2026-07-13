import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OwnedGraph2dControls } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';
import { renderOwnedGraphFrame } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame';
import { startOwnedGraphFrameLoop, type OwnedGraphFrameLoopRuntime } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/frameLoop';

vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame', () => ({
  renderOwnedGraphFrame: vi.fn(),
}));

class ResizeObserverHarness {
  static instance: ResizeObserverHarness | undefined;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverHarness.instance = this;
  }
  unobserve(): void {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  ResizeObserverHarness.instance = undefined;
});

describe('owned graph frame loop', () => {
  it('publishes sampled FPS only for submitted frames while the setting is enabled', () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return 17;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', ResizeObserverHarness);
    vi.mocked(renderOwnedGraphFrame).mockImplementation((runtime) => {
      runtime.recordRenderedFrame(100);
      return 100;
    });
    const record = vi.fn(() => 57);
    const publishFps = vi.fn();
    const runtime = {
      animationFrameRef: { current: null },
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      engineStopNotifiedRef: { current: false },
      fpsRef: { current: null },
      fpsSamplerRef: { current: { fps: 57, record, reset: vi.fn() } },
      frameRequestedRef: { current: false },
      gpuRendererRef: { current: null },
      layoutRef: { current: null },
      propsRef: { current: { showFps: true } },
      publishFps,
      recordRenderedFrame: () => undefined,
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: () => {} },
      skipPhysicsFrameRef: { current: false },
    } as unknown as OwnedGraphFrameLoopRuntime;

    const loop = startOwnedGraphFrameLoop(
      runtime,
      document.createElement('canvas'),
      { current: undefined },
    );
    scheduledFrame?.(100);

    expect(record).toHaveBeenCalledWith(100);
    expect(runtime.fpsRef.current).toBe(57);
    expect(publishFps).toHaveBeenCalledWith(57);

    vi.mocked(renderOwnedGraphFrame).mockReturnValue(120);
    runtime.requestFrameRef.current();
    scheduledFrame?.(120);
    expect(record).toHaveBeenCalledOnce();

    loop.dispose();
  });

  it('keeps frame demand distinct from RAF scheduling and cleans up loop ownership', () => {
    const requestAnimationFrame = vi.fn(() => 17);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.stubGlobal('ResizeObserver', ResizeObserverHarness);
    const controlsRef = { current: undefined } as { current: OwnedGraph2dControls | undefined };
    const runtime = {
      animationFrameRef: { current: null },
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      engineStopNotifiedRef: { current: false },
      frameRequestedRef: { current: false },
      gpuRendererRef: { current: { canRender: () => false } },
      layoutRef: { current: null },
      recordRenderedFrame: () => undefined,
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: () => {} },
      skipPhysicsFrameRef: { current: false },
    } as unknown as OwnedGraphFrameLoopRuntime;
    const canvas = document.createElement('canvas');

    const loop = startOwnedGraphFrameLoop(runtime, canvas, controlsRef);

    expect(runtime.frameRequestedRef.current).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(ResizeObserverHarness.instance?.observe).toHaveBeenCalledWith(canvas);
    expect(controlsRef.current).toBe(loop.controls);

    runtime.gpuRendererRef.current = null;
    runtime.requestFrameRef.current();
    runtime.requestFrameRef.current();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(runtime.animationFrameRef.current).toBe(17);

    loop.dispose();
    expect(ResizeObserverHarness.instance?.disconnect).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
    expect(runtime.animationFrameRef.current).toBeNull();
    expect(controlsRef.current).toBeUndefined();
    runtime.requestFrameRef.current();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
});

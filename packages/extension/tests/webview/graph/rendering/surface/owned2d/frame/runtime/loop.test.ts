import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OwnedGraph2dControls } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';
import { renderOwnedGraphFrame } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import { startOwnedGraphFrameLoop, type OwnedGraphFrameLoopRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/loop';

vi.mock('../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render', () => ({
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
  it('stages submitted frame measurements and publishes explicit idle state', () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return 17;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', ResizeObserverHarness);
    vi.mocked(renderOwnedGraphFrame).mockImplementation((runtime) => {
      runtime.recordRenderedFrame(7, 100, 2, 3);
    });
    const publishedSample = {
      status: 'active' as const,
      renderedFps: 50,
      frameTimeMs: 5,
      sampleCount: 10,
    };
    const idleSample = { status: 'idle' as const };
    const stageFrame = vi.fn();
    const setIdle = vi.fn(() => idleSample);
    const publishPerformance = vi.fn();
    const runtime = {
      animationFrameRef: { current: null },
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      engineStopNotifiedRef: { current: false },
      fpsRef: { current: null },
      performanceMonitorRef: {
        current: {
          completeFrame: vi.fn(),
          discardFrame: vi.fn(),
          reset: vi.fn(),
          sample: () => publishedSample,
          setIdle,
          stageFrame,
        },
      },
      frameRequestedRef: { current: false },
      gpuRendererRef: { current: null },
      layoutRef: { current: null },
      propsRef: { current: { showFps: false } },
      publishPerformance,
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: () => {} },
    } as unknown as OwnedGraphFrameLoopRuntime;

    const loop = startOwnedGraphFrameLoop(
      runtime,
      document.createElement('canvas'),
      { current: undefined },
    );
    expect(runtime).not.toHaveProperty('recordRenderedFrame');
    expect(runtime).not.toHaveProperty('markPerformanceIdle');
    scheduledFrame?.(100);

    expect(stageFrame).toHaveBeenCalledWith(7, {
      presentationTimestampMs: 100,
      renderMs: 3,
      secondaryRefreshMs: undefined,
      simulationMs: 2,
    });
    expect(runtime.fpsRef.current).toBeNull();
    expect(publishPerformance).not.toHaveBeenCalled();

    vi.mocked(renderOwnedGraphFrame).mockImplementation((runtime) => {
      runtime.markPerformanceIdle();
    });
    runtime.requestFrameRef.current();
    scheduledFrame?.(120);
    expect(setIdle).toHaveBeenCalledOnce();
    expect(runtime.fpsRef.current).toBeNull();
    expect(publishPerformance).toHaveBeenLastCalledWith(idleSample);

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
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: () => {} },
    } as unknown as OwnedGraphFrameLoopRuntime;
    const canvas = document.createElement('canvas');

    const loop = startOwnedGraphFrameLoop(runtime, canvas, controlsRef);

    expect(runtime.frameRequestedRef.current).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(ResizeObserverHarness.instance?.observe).toHaveBeenCalledWith(canvas);
    expect(controlsRef.current).toBeDefined();

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

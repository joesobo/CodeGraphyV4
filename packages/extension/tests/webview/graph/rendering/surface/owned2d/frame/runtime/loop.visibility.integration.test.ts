import type { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  startOwnedGraphFrameLoop,
  type OwnedGraphFrameLoopRuntime,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/loop';
import { canvasFixture, runtimeFixture } from './fixture';

class ResizeObserverHarness {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

afterEach(() => vi.unstubAllGlobals());

describe('owned graph retained-view visibility', () => {
  it('stops renderer submissions and physics after a running host view becomes hidden', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      callbacks.set(id, callback);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => callbacks.delete(id)));
    vi.stubGlobal('ResizeObserver', ResizeObserverHarness);

    const renderer = {
      canRender: () => true,
      render: vi.fn(() => 1),
    } as unknown as WebGpuGraphRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    const physicsTick = vi.spyOn(layout.engine, 'tick');
    const loopRuntime = {
      ...runtime,
      animationFrameRef: { current: null },
      fpsRef: { current: null },
      frameRequestedRef: { current: false },
      performanceMonitorRef: {
        current: {
          completeFrame: vi.fn(),
          discardFrame: vi.fn(),
          reset: vi.fn(),
          sample: vi.fn(() => ({ status: 'idle' as const })),
          setIdle: vi.fn(() => ({ status: 'idle' as const })),
          stageFrame: vi.fn(),
        },
      },
      publishPerformance: vi.fn(),
    } as unknown as OwnedGraphFrameLoopRuntime;
    const canvas = canvasFixture();
    const loop = startOwnedGraphFrameLoop(loopRuntime, canvas, { current: undefined });

    const firstFrame = callbacks.values().next().value;
    callbacks.clear();
    firstFrame?.(100);
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(physicsTick).toHaveBeenCalled();
    expect(callbacks.size).toBe(1);

    loop.setHostVisible(false);
    const submissionsWhenHidden = vi.mocked(renderer.render).mock.calls.length;
    const physicsTicksWhenHidden = physicsTick.mock.calls.length;
    loopRuntime.requestFrameRef.current();

    expect(callbacks.size).toBe(0);
    expect(renderer.render).toHaveBeenCalledTimes(submissionsWhenHidden);
    expect(physicsTick).toHaveBeenCalledTimes(physicsTicksWhenHidden);

    loop.dispose();
  });
});

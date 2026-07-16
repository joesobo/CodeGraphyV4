import type { WebGpuGraphRenderer as OwnedWebGpuRenderer } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import { transitionOwnedGraphCamera } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera/runtime/model';
import { renderOwnedGraphFrame } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import { canvasFixture, runtimeFixture } from './fixture';

describe('owned graph frame lifecycle', () => {
  it('marks performance idle only when the simulation deliberately settles', () => {
    const renderer = { render: vi.fn(() => 1) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(
      1,
      100,
      expect.any(Number),
      expect.any(Number),
      undefined,
    );
    expect(runtime.markPerformanceIdle).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });

  it('keeps live performance presentation running after physics settles', () => {
    const renderer = { render: vi.fn(() => 2) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    runtime.propsRef.current.showFps = true;
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
    expect(runtime.markPerformanceIdle).not.toHaveBeenCalled();
  });

  it('renders camera transitions through settlement without leaving idle work', () => {
    const renderer = { render: vi.fn(() => 3) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });
    transitionOwnedGraphCamera(runtime.cameraRef.current, { zoom: 4 }, 300, 100);

    renderOwnedGraphFrame(runtime, canvasFixture(), 250);
    expect(runtime.cameraRef.current.zoom).toBeCloseTo(4 ** 0.875, 8);
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
    expect(runtime.markPerformanceIdle).not.toHaveBeenCalled();

    vi.mocked(runtime.requestFrameRef.current).mockClear();
    renderOwnedGraphFrame(runtime, canvasFixture(), 400);
    expect(runtime.cameraRef.current.zoom).toBe(4);
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
    expect(runtime.markPerformanceIdle).toHaveBeenCalledOnce();
  });

  it('does not advance frame time before layout prerequisites exist', () => {
    const renderer = { render: vi.fn(() => 4) } as unknown as OwnedWebGpuRenderer;
    const { runtime } = runtimeFixture(renderer);
    runtime.layoutRef.current = null;

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('disposes a failed renderer, pauses physics, and reports the failure', () => {
    const renderer = {
      dispose: vi.fn(),
      render: vi.fn(() => { throw new Error('submission failed'); }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBeNull();
    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(runtime.onRendererError).toHaveBeenCalledWith('submission failed');
    expect(layout.engine.tick().steps).toBe(0);
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });
});

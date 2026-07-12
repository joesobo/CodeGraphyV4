import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import type { OwnedGraphRendererLifecycleRuntime } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/rendererLifecycle';
import type { GraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { createDefaultSurfaceProps } from '../view/surfaceFixture';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer', () => ({
  OwnedWebGpuRenderer: class OwnedWebGpuRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { startOwnedGraphRendererLifecycle } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/rendererLifecycle';

interface Harness {
  engine: Pick<GraphLayoutEngine, 'pause' | 'reheat' | 'resume'>;
  runtime: OwnedGraphRendererLifecycleRuntime;
}

function runtimeHarness(): Harness {
  const engine = {
    pause: vi.fn(),
    reheat: vi.fn(),
    resume: vi.fn(),
  };
  const layout = { engine } as unknown as OwnedGraphLayout;
  return {
    engine,
    runtime: {
      engineStopNotifiedRef: { current: true },
      frameRequestedRef: { current: false },
      gpuRendererRef: { current: null },
      layoutRef: { current: layout },
      propsRef: { current: createDefaultSurfaceProps() },
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: vi.fn() },
      onError: vi.fn(),
      onReady: vi.fn(),
    },
  };
}

async function flushLifecycle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('owned WebGPU renderer lifecycle', () => {
  beforeEach(() => {
    rendererHarness.create.mockReset();
  });

  it('pauses physics and reports an unavailable renderer', async () => {
    rendererHarness.create.mockResolvedValue(undefined);
    const { engine, runtime } = runtimeHarness();

    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(runtime.onError).toHaveBeenCalledWith('WebGPU is unavailable in this environment.');
    expect(runtime.onReady).not.toHaveBeenCalled();
  });

  it('activates a ready renderer and resumes an eligible layout', async () => {
    const renderer = { dispose: vi.fn() };
    rendererHarness.create.mockResolvedValue(renderer);
    const { engine, runtime } = runtimeHarness();

    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    expect(runtime.gpuRendererRef.current).toBe(renderer);
    expect(runtime.rendererOperationalRef.current).toBe(true);
    expect(engine.resume).toHaveBeenCalledOnce();
    expect(engine.reheat).toHaveBeenCalledOnce();
    expect(runtime.engineStopNotifiedRef.current).toBe(false);
    expect(runtime.onReady).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
  });

  it('disposes a renderer that resolves after lifecycle teardown', async () => {
    let resolveRenderer!: (renderer: { dispose(): void }) => void;
    rendererHarness.create.mockReturnValue(new Promise(resolve => {
      resolveRenderer = resolve;
    }));
    const renderer = { dispose: vi.fn() };
    const { runtime } = runtimeHarness();
    const lifecycle = startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));

    lifecycle.dispose();
    resolveRenderer(renderer);
    await flushLifecycle();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBeNull();
    expect(runtime.onReady).not.toHaveBeenCalled();
  });

  it('disposes before reporting device loss and requests an error frame', async () => {
    const renderer = { dispose: vi.fn() };
    rendererHarness.create.mockResolvedValue(renderer);
    const { engine, runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    options.onDeviceLost('GPU reset');

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBeNull();
    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(runtime.onError).toHaveBeenCalledWith('GPU reset');
    expect(runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });

  it('retries pending frame demand only while active', async () => {
    rendererHarness.create.mockResolvedValue({ dispose: vi.fn() });
    const { runtime } = runtimeHarness();
    runtime.frameRequestedRef.current = true;
    const lifecycle = startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onFrameComplete(): void;
    };
    vi.mocked(runtime.requestFrameRef.current).mockClear();

    options.onFrameComplete();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
    lifecycle.dispose();
    options.onFrameComplete();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import type { OwnedGraphRendererLifecycleRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/renderer/runtime/lifecycle';
import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/timing/clock';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('@codegraphy-dev/graph-renderer', async importOriginal => ({
  ...await importOriginal<typeof import('@codegraphy-dev/graph-renderer')>(),
  WebGpuGraphRenderer: class WebGpuGraphRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { startOwnedGraphRendererLifecycle } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/renderer/runtime/lifecycle';

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
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: vi.fn() },
      simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
      onError: vi.fn(),
      onFrameComplete: vi.fn(),
      onFrameRejected: vi.fn(),
      onReady: vi.fn(),
      onRecovering: vi.fn(),
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

  it('pauses physics and reports renderer creation failures', async () => {
    rendererHarness.create.mockRejectedValue(new Error('adapter request failed'));
    const { engine, runtime } = runtimeHarness();

    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(runtime.onError).toHaveBeenCalledWith('adapter request failed');
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

  it('recreates the renderer after device loss before surfacing an error', async () => {
    const renderer = { dispose: vi.fn() };
    const replacement = { dispose: vi.fn() };
    rendererHarness.create
      .mockResolvedValueOnce(renderer)
      .mockResolvedValueOnce(replacement);
    const { engine, runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    options.onDeviceLost('GPU reset');
    await flushLifecycle();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(rendererHarness.create).toHaveBeenCalledTimes(2);
    expect(runtime.gpuRendererRef.current).toBe(replacement);
    expect(runtime.rendererOperationalRef.current).toBe(true);
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(engine.resume).toHaveBeenCalledTimes(2);
    expect(runtime.onRecovering).toHaveBeenCalledOnce();
    expect(runtime.onError).not.toHaveBeenCalled();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });

  it('recreates the renderer after an uncaptured runtime error', async () => {
    const renderer = { dispose: vi.fn() };
    const replacement = { dispose: vi.fn() };
    rendererHarness.create
      .mockResolvedValueOnce(renderer)
      .mockResolvedValueOnce(replacement);
    const { engine, runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onRendererError(message: string): void;
    };

    options.onRendererError('node buffer is too large');
    await flushLifecycle();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(rendererHarness.create).toHaveBeenCalledTimes(2);
    expect(runtime.gpuRendererRef.current).toBe(replacement);
    expect(runtime.rendererOperationalRef.current).toBe(true);
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(runtime.onRecovering).toHaveBeenCalledOnce();
    expect(runtime.onError).not.toHaveBeenCalled();
  });

  it('surfaces device loss after two replacement attempts fail', async () => {
    const renderer = { dispose: vi.fn() };
    rendererHarness.create
      .mockResolvedValueOnce(renderer)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const { runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    options.onDeviceLost('GPU reset');
    await flushLifecycle();
    await flushLifecycle();

    expect(rendererHarness.create).toHaveBeenCalledTimes(3);
    expect(runtime.onRecovering).toHaveBeenCalledTimes(2);
    expect(runtime.onError).toHaveBeenCalledWith('WebGPU is unavailable in this environment.');
    expect(runtime.rendererOperationalRef.current).toBe(false);
  });

  it('disposes an initially created renderer if its device is lost before creation resolves', async () => {
    let resolveInitial!: (renderer: { dispose(): void }) => void;
    const initial = { dispose: vi.fn() };
    const replacement = { dispose: vi.fn() };
    rendererHarness.create
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveInitial = resolve;
      }))
      .mockResolvedValueOnce(replacement);
    const { runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    const firstOptions = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    firstOptions.onDeviceLost('early reset');
    await flushLifecycle();
    resolveInitial(initial);
    await flushLifecycle();

    expect(initial.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBe(replacement);
    expect(runtime.onError).not.toHaveBeenCalled();
  });

  it('ignores stale loss callbacks after a replacement activates', async () => {
    rendererHarness.create.mockResolvedValue({ dispose: vi.fn() });
    const { runtime } = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const firstOptions = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    firstOptions.onDeviceLost('first reset');
    await flushLifecycle();
    firstOptions.onDeviceLost('stale reset');
    await flushLifecycle();

    expect(rendererHarness.create).toHaveBeenCalledTimes(2);
    expect(runtime.onError).not.toHaveBeenCalled();
  });

  it('releases pending frame demand for success and rejection only while active', async () => {
    rendererHarness.create.mockResolvedValue({ dispose: vi.fn() });
    const { runtime } = runtimeHarness();
    runtime.frameRequestedRef.current = true;
    const lifecycle = startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();
    const options = rendererHarness.create.mock.calls[0][1] as {
      onFrameComplete(submissionId: number): void;
      onFrameRejected(submissionId: number): void;
    };
    vi.mocked(runtime.requestFrameRef.current).mockClear();

    options.onFrameComplete(1);
    expect(runtime.onFrameComplete).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();

    options.onFrameRejected(2);
    expect(runtime.onFrameRejected).toHaveBeenCalledWith(2);
    expect(runtime.onFrameComplete).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);

    lifecycle.dispose();
    options.onFrameComplete(3);
    options.onFrameRejected(4);
    expect(runtime.onFrameComplete).toHaveBeenCalledOnce();
    expect(runtime.onFrameRejected).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });
});

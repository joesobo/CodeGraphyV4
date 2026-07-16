import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import type { OwnedGraphRendererLifecycleRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/renderer/runtime/lifecycle';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/timing/clock';

const rendererHarness = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@codegraphy-dev/graph-renderer', async importOriginal => ({
  ...await importOriginal<typeof import('@codegraphy-dev/graph-renderer')>(),
  WebGpuGraphRenderer: class WebGpuGraphRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { startOwnedGraphRendererLifecycle } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/renderer/runtime/lifecycle';

interface RendererCallbacks {
  onDeviceLost(message: string): void;
  onFrameComplete(submissionId: number): void;
  onFrameRejected(submissionId: number): void;
}

function runtimeHarness(): OwnedGraphRendererLifecycleRuntime {
  const engine = {
    pause: vi.fn(),
    reheat: vi.fn(),
    resume: vi.fn(),
  } as Pick<GraphLayoutEngine, 'pause' | 'reheat' | 'resume'>;
  return {
    engineStopNotifiedRef: { current: true },
    frameRequestedRef: { current: false },
    gpuRendererRef: { current: null },
    layoutRef: { current: { engine } as unknown as OwnedGraphLayout },
    rendererOperationalRef: { current: false },
    requestFrameRef: { current: vi.fn() },
    simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
    onError: vi.fn(),
    onFrameComplete: vi.fn(),
    onFrameRejected: vi.fn(),
    onReady: vi.fn(),
    onRecovering: vi.fn(),
  };
}

async function flushLifecycle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function callbacksAt(index: number): RendererCallbacks {
  return rendererHarness.create.mock.calls[index][1] as RendererCallbacks;
}

describe('owned WebGPU renderer recovery health', () => {
  beforeEach(() => {
    rendererHarness.create.mockReset();
    rendererHarness.create.mockImplementation(async () => ({ dispose: vi.fn() }));
  });

  it('resets the consecutive recovery budget only after successful GPU work', async () => {
    const runtime = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    callbacksAt(0).onDeviceLost('first reset');
    await flushLifecycle();
    callbacksAt(1).onDeviceLost('second reset');
    await flushLifecycle();
    callbacksAt(2).onFrameComplete(1);
    callbacksAt(2).onDeviceLost('healthy replacement later reset');
    await flushLifecycle();

    expect(rendererHarness.create).toHaveBeenCalledTimes(4);
    expect(runtime.onRecovering).toHaveBeenCalledTimes(3);
    expect(runtime.onError).not.toHaveBeenCalled();
  });

  it('does not reset the recovery budget when current GPU work is rejected', async () => {
    const runtime = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    callbacksAt(0).onDeviceLost('first reset');
    await flushLifecycle();
    callbacksAt(1).onFrameRejected(10);
    callbacksAt(1).onDeviceLost('second reset');
    await flushLifecycle();
    callbacksAt(2).onFrameRejected(11);
    callbacksAt(2).onDeviceLost('third consecutive reset');
    await flushLifecycle();

    expect(runtime.onFrameRejected).toHaveBeenCalledTimes(2);
    expect(runtime.onFrameComplete).not.toHaveBeenCalled();
    expect(rendererHarness.create).toHaveBeenCalledTimes(3);
    expect(runtime.onError).toHaveBeenCalledWith('third consecutive reset');
  });

  it('ignores stale completion callbacks when counting consecutive recovery attempts', async () => {
    const runtime = runtimeHarness();
    startOwnedGraphRendererLifecycle(runtime, document.createElement('canvas'));
    await flushLifecycle();

    callbacksAt(0).onDeviceLost('first reset');
    await flushLifecycle();
    callbacksAt(0).onFrameComplete(1);
    callbacksAt(1).onDeviceLost('second reset');
    await flushLifecycle();
    callbacksAt(1).onFrameComplete(1);
    callbacksAt(2).onDeviceLost('third consecutive reset');
    await flushLifecycle();

    expect(rendererHarness.create).toHaveBeenCalledTimes(3);
    expect(runtime.onRecovering).toHaveBeenCalledTimes(2);
    expect(runtime.onError).toHaveBeenCalledWith('third consecutive reset');
  });
});

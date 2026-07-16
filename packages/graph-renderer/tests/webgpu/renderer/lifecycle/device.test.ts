import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGpuGraphRenderer } from '@graph-renderer';
import { cleanUpWebGpuHarness, rendererFrame, webGpuHarness } from '../harness/webgpu';

afterEach(cleanUpWebGpuHarness);

describe('WebGPU renderer lifecycle', () => {
  it('requests a software WebGPU adapter when no native adapter is available', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(harness.adapter);

    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });

    expect(renderer).toBeDefined();
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(1, {
      powerPreference: 'high-performance',
    });
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(2, {
      forceFallbackAdapter: true,
    });
  });

  it('reports WebGPU as unavailable when the browser has no GPU API', async () => {
    const harness = webGpuHarness();
    Reflect.deleteProperty(navigator, 'gpu');

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
  });

  it('reports WebGPU as unavailable when no adapter can be created', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter.mockResolvedValue(null);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
    expect(harness.gpu.requestAdapter).toHaveBeenCalledTimes(2);
    expect(harness.adapter.requestDevice).not.toHaveBeenCalled();
  });

  it('destroys the device when the canvas has no WebGPU context', async () => {
    const harness = webGpuHarness();
    Object.defineProperty(harness.canvas, 'getContext', { value: () => null });

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up the context when pipeline validation fails', async () => {
    const harness = webGpuHarness();
    harness.device.popErrorScope.mockResolvedValue({ message: 'invalid pipeline' } as never);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).rejects.toThrow('WebGPU pipeline validation failed: invalid pipeline');
    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it.each([
    ['unknown', 1],
    ['destroyed', 0],
  ] as const)('reports %s device loss appropriately', async (reason, expectedCalls) => {
    const harness = webGpuHarness();
    const onDeviceLost = vi.fn();
    await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost,
      onFrameComplete: vi.fn(),
    });

    harness.resolveDeviceLost({ message: 'device lost', reason } as GPUDeviceLostInfo);
    await Promise.resolve();

    expect(onDeviceLost).toHaveBeenCalledTimes(expectedCalls);
  });

  it('destroys the device when canvas context creation throws', async () => {
    const harness = webGpuHarness();
    Object.defineProperty(harness.canvas, 'getContext', {
      value: () => { throw new Error('context failed'); },
    });

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).rejects.toThrow('context failed');

    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('reports rejected GPU work with its submission identity without reporting success', async () => {
    const harness = webGpuHarness();
    vi.mocked(harness.device.queue.onSubmittedWorkDone)
      .mockReturnValueOnce(Promise.reject(new Error('device lost')));
    const onFrameComplete = vi.fn();
    const onFrameRejected = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete,
      onFrameRejected,
    });

    expect(renderer!.render(rendererFrame())).toBe(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFrameRejected).toHaveBeenCalledWith(1);
    expect(onFrameComplete).not.toHaveBeenCalled();
    expect(renderer!.canRender()).toBe(true);
  });

  it('disposes GPU resources only once', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });

    renderer!.dispose();
    renderer!.dispose();

    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
    const buffers = harness.device.createBuffer.mock.results.map(result => result.value);
    for (const buffer of buffers) expect(buffer.destroy).toHaveBeenCalledOnce();
  });
});

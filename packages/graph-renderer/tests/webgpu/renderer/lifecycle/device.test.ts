import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGpuGraphRenderer } from '@graph-renderer';
import { cleanUpWebGpuHarness, rendererFrame, webGpuHarness } from '../harness/webgpu';

afterEach(cleanUpWebGpuHarness);

describe('WebGPU renderer lifecycle', () => {
  it('requests a software WebGPU device when native device creation fails', async () => {
    const harness = webGpuHarness();
    const fallbackAdapter = { requestDevice: vi.fn(async () => harness.device) };
    harness.adapter.requestDevice.mockRejectedValueOnce(new Error('native device failed'));
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(harness.adapter)
      .mockResolvedValueOnce(fallbackAdapter);

    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });

    expect(renderer).toBeDefined();
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(2, {
      forceFallbackAdapter: true,
    });
    expect(fallbackAdapter.requestDevice).toHaveBeenCalledOnce();
  });

  it('surfaces native device failure when no software adapter is available', async () => {
    const harness = webGpuHarness();
    harness.adapter.requestDevice.mockRejectedValueOnce(new Error('native device failed'));
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(harness.adapter)
      .mockResolvedValueOnce(null);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    })).rejects.toThrow('native device failed');
  });

  it('requests a software WebGPU adapter when native adapter acquisition fails', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter
      .mockRejectedValueOnce(new Error('native adapter failed'))
      .mockResolvedValueOnce(harness.adapter);

    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });

    expect(renderer).toBeDefined();
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(2, {
      forceFallbackAdapter: true,
    });
  });

  it('requests a software WebGPU adapter when no native adapter is available', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(harness.adapter);

    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
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
      onRendererError: vi.fn(),
    })).resolves.toBeUndefined();
  });

  it('reports WebGPU as unavailable when no adapter can be created', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter.mockResolvedValue(null);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
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
      onRendererError: vi.fn(),
    })).resolves.toBeUndefined();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up the context when pipeline validation fails', async () => {
    const harness = webGpuHarness();
    harness.device.popErrorScope
      .mockResolvedValueOnce({ message: 'invalid pipeline' } as never)
      .mockResolvedValueOnce(null);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    })).rejects.toThrow('WebGPU pipeline validation failed: invalid pipeline');
    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up the context when pipeline allocation fails', async () => {
    const harness = webGpuHarness();
    harness.device.popErrorScope
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ message: 'out of memory' } as never);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    })).rejects.toThrow('WebGPU pipeline allocation failed: out of memory');
    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up the context when pipeline creation has an internal error', async () => {
    const harness = webGpuHarness();
    harness.device.popErrorScope
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ message: 'driver failed' } as never);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    })).rejects.toThrow('WebGPU pipeline creation failed: driver failed');
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
      onRendererError: vi.fn(),
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
      onRendererError: vi.fn(),
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
      onRendererError: vi.fn(),
    });

    expect(renderer!.render(rendererFrame())).toBe(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFrameRejected).toHaveBeenCalledWith(1);
    expect(onFrameComplete).not.toHaveBeenCalled();
    expect(renderer!.canRender()).toBe(true);
  });

  it('does not report frame success when scoped runtime validation fails', async () => {
    const harness = webGpuHarness();
    const onFrameComplete = vi.fn();
    const onFrameRejected = vi.fn();
    const onRendererError = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete,
      onFrameRejected,
      onRendererError,
    });
    harness.device.popErrorScope
      .mockResolvedValueOnce({ message: 'node buffer is invalid' } as never)
      .mockResolvedValueOnce(null);

    expect(renderer!.render(rendererFrame())).toBe(1);
    await vi.waitFor(() => {
      expect(onRendererError).toHaveBeenCalledWith('node buffer is invalid');
    });

    expect(onFrameComplete).not.toHaveBeenCalled();
    expect(onFrameRejected).not.toHaveBeenCalled();
    expect(renderer!.canRender()).toBe(true);
  });

  it('reports uncaptured runtime errors until the renderer is disposed', async () => {
    const harness = webGpuHarness();
    const onRendererError = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError,
    });

    const event = harness.emitUncapturedError('node buffer is too large');

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onRendererError).toHaveBeenCalledWith('node buffer is too large');

    renderer!.dispose();
    harness.emitUncapturedError('stale error');

    expect(onRendererError).toHaveBeenCalledOnce();
    expect(harness.device.addEventListener).toHaveBeenCalledOnce();
    expect(harness.device.removeEventListener).toHaveBeenCalledOnce();
  });

  it('disposes GPU resources only once', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });

    renderer!.dispose();
    renderer!.dispose();

    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
    const buffers = harness.device.createBuffer.mock.results.map(result => result.value);
    for (const buffer of buffers) expect(buffer.destroy).toHaveBeenCalledOnce();
  });
});

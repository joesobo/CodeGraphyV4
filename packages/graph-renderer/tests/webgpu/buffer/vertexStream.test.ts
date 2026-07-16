import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VertexStream } from '../../../src/webgpu/buffer/vertexStream';
import { uploadVertexStream } from '../../../src/webgpu/buffer/vertexStream';
import { cleanUpWebGpuHarness, webGpuHarness } from '../renderer/harness/webgpu';

afterEach(cleanUpWebGpuHarness);

function vertexStream(buffer: GPUBuffer): VertexStream {
  return { buffer, capacity: 256, label: 'Test vertex stream' };
}

describe('WebGPU vertex stream growth', () => {
  it('keeps the previous buffer when replacement allocation throws', () => {
    const harness = webGpuHarness();
    const previous = { destroy: vi.fn() } as unknown as GPUBuffer;
    const stream = vertexStream(previous);
    harness.device.createBuffer.mockImplementationOnce(() => {
      throw new Error('allocation failed');
    });

    expect(() => uploadVertexStream(
      harness.device as unknown as GPUDevice,
      stream,
      new Float32Array(65),
      260,
    )).toThrow('allocation failed');

    expect(stream.buffer).toBe(previous);
    expect(stream.capacity).toBe(256);
    expect(previous.destroy).not.toHaveBeenCalled();
  });

  it('allocates the exact payload when doubling would exceed maxBufferSize', () => {
    const harness = webGpuHarness();
    harness.device.limits.maxBufferSize = 300;
    const previous = { destroy: vi.fn() } as unknown as GPUBuffer;
    const stream = vertexStream(previous);

    uploadVertexStream(
      harness.device as unknown as GPUDevice,
      stream,
      new Float32Array(65),
      260,
    );

    expect(harness.device.createBuffer).toHaveBeenCalledWith(expect.objectContaining({
      size: 260,
    }));
    expect(previous.destroy).toHaveBeenCalledOnce();
    expect(stream.capacity).toBe(260);
  });
});

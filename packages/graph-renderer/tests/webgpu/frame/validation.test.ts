import { describe, expect, it, vi } from 'vitest';
import {
  beginFrameValidation,
  endFrameValidation,
} from '../../../src/webgpu/frame/validation';

describe('WebGPU frame validation scopes', () => {
  it('captures validation and out-of-memory errors around a frame', async () => {
    const validationError = { message: 'invalid frame' } as GPUError;
    const device = {
      popErrorScope: vi.fn()
        .mockResolvedValueOnce(validationError)
        .mockResolvedValueOnce(null),
      pushErrorScope: vi.fn(),
    } as unknown as GPUDevice;

    beginFrameValidation(device);
    const error = await endFrameValidation(device);

    expect(device.pushErrorScope).toHaveBeenNthCalledWith(1, 'internal');
    expect(device.pushErrorScope).toHaveBeenNthCalledWith(2, 'out-of-memory');
    expect(device.pushErrorScope).toHaveBeenNthCalledWith(3, 'validation');
    expect(device.popErrorScope).toHaveBeenCalledTimes(3);
    expect(error).toBe(validationError);
  });

  it('reports an internal error when validation and allocation succeed', async () => {
    const internalError = { message: 'internal failure' } as GPUError;
    const device = {
      popErrorScope: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(internalError),
      pushErrorScope: vi.fn(),
    } as unknown as GPUDevice;

    beginFrameValidation(device);

    await expect(endFrameValidation(device)).resolves.toBe(internalError);
  });

  it('reports an out-of-memory error when validation succeeds', async () => {
    const outOfMemoryError = { message: 'out of memory' } as GPUError;
    const device = {
      popErrorScope: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(outOfMemoryError),
      pushErrorScope: vi.fn(),
    } as unknown as GPUDevice;

    beginFrameValidation(device);

    await expect(endFrameValidation(device)).resolves.toBe(outOfMemoryError);
  });
});

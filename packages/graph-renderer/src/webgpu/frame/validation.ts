export function beginFrameValidation(device: GPUDevice): void {
  device.pushErrorScope('internal');
  device.pushErrorScope('out-of-memory');
  device.pushErrorScope('validation');
}

export async function endFrameValidation(device: GPUDevice): Promise<GPUError | null> {
  const validationError = device.popErrorScope();
  const outOfMemoryError = device.popErrorScope();
  const internalError = device.popErrorScope();
  const [validation, outOfMemory, internal] = await Promise.all([
    validationError,
    outOfMemoryError,
    internalError,
  ]);
  return validation ?? outOfMemory ?? internal;
}

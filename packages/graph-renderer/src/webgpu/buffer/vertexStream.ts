export interface VertexStream {
  buffer: GPUBuffer;
  capacity: number;
  readonly label: string;
}

function nextBufferSize(requiredBytes: number, maximumBytes: number): number {
  let size = 256;
  while (size < requiredBytes) {
    if (size > maximumBytes / 2) return requiredBytes;
    size *= 2;
  }
  return size;
}

export function createVertexStream(device: GPUDevice, label: string): VertexStream {
  return {
    buffer: device.createBuffer({
      label,
      size: 256,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    }),
    capacity: 256,
    label,
  };
}

export function uploadVertexStream(
  device: GPUDevice,
  stream: VertexStream,
  values: Float32Array,
  byteLength: number,
): void {
  if (byteLength > stream.capacity) {
    const capacity = nextBufferSize(byteLength, device.limits.maxBufferSize);
    const buffer = device.createBuffer({
      label: stream.label,
      size: capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    stream.buffer.destroy();
    stream.buffer = buffer;
    stream.capacity = capacity;
  }
  if (byteLength > 0) {
    device.queue.writeBuffer(stream.buffer, 0, values.buffer, values.byteOffset, byteLength);
  }
}

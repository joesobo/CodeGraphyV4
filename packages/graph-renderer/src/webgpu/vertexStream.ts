export interface VertexStream {
  buffer: GPUBuffer;
  capacity: number;
  readonly label: string;
}

function nextBufferSize(requiredBytes: number): number {
  let size = 256;
  while (size < requiredBytes) size *= 2;
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
    stream.buffer.destroy();
    stream.capacity = nextBufferSize(byteLength);
    stream.buffer = device.createBuffer({
      label: stream.label,
      size: stream.capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }
  if (byteLength > 0) {
    device.queue.writeBuffer(stream.buffer, 0, values.buffer, values.byteOffset, byteLength);
  }
}

import type { GraphRendererFrame } from '../contracts';

export function resizeGraphCanvas(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  frame: GraphRendererFrame,
): void {
  const maximum = device.limits.maxTextureDimension2D;
  const width = Math.min(Math.max(1, Math.round(frame.cssWidth * frame.devicePixelRatio)), maximum);
  const height = Math.min(Math.max(1, Math.round(frame.cssHeight * frame.devicePixelRatio)), maximum);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

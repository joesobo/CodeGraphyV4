import { createLinkPipelines } from './link/pipeline';
import { createNodePipeline } from './node/pipeline';

export interface RendererResources {
  arrow: GPURenderPipeline;
  context: GPUCanvasContext;
  device: GPUDevice;
  format: GPUTextureFormat;
  link: GPURenderPipeline;
  node: GPURenderPipeline;
}

async function requestAdapterDevice(
  gpu: GPU,
  options: GPURequestAdapterOptions,
): Promise<GPUDevice | undefined> {
  const adapter = await gpu.requestAdapter(options);
  return adapter?.requestDevice();
}

async function requestDevice(gpu: GPU): Promise<GPUDevice | undefined> {
  let preferredError: Error | undefined;
  try {
    const preferredDevice = await requestAdapterDevice(gpu, { powerPreference: 'high-performance' });
    if (preferredDevice) return preferredDevice;
  } catch (error) {
    preferredError = error instanceof Error ? error : new Error(String(error));
  }
  const fallbackDevice = await requestAdapterDevice(gpu, { forceFallbackAdapter: true });
  if (fallbackDevice) return fallbackDevice;
  if (preferredError !== undefined) throw preferredError;
  return undefined;
}

export async function createRendererResources(
  canvas: HTMLCanvasElement,
): Promise<RendererResources | undefined> {
  const gpu = navigator.gpu;
  if (!gpu) return undefined;
  const device = await requestDevice(gpu);
  if (!device) return undefined;
  let context: GPUCanvasContext | null = null;
  try {
    context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return undefined;
    }
    const format = gpu.getPreferredCanvasFormat();
    context.configure({ alphaMode: 'premultiplied', device, format });
    device.pushErrorScope('internal');
    device.pushErrorScope('out-of-memory');
    device.pushErrorScope('validation');
    const node = createNodePipeline(device, format);
    const { arrow, link } = createLinkPipelines(device, format);
    const validationResult = device.popErrorScope();
    const outOfMemoryResult = device.popErrorScope();
    const internalResult = device.popErrorScope();
    const [validationError, outOfMemoryError, internalError] = await Promise.all([
      validationResult,
      outOfMemoryResult,
      internalResult,
    ]);
    if (validationError) {
      throw new Error(`WebGPU pipeline validation failed: ${validationError.message}`);
    }
    if (outOfMemoryError) {
      throw new Error(`WebGPU pipeline allocation failed: ${outOfMemoryError.message}`);
    }
    if (internalError) {
      throw new Error(`WebGPU pipeline creation failed: ${internalError.message}`);
    }
    return { arrow, context, device, format, link, node };
  } catch (error) {
    context?.unconfigure();
    device.destroy();
    throw error;
  }
}

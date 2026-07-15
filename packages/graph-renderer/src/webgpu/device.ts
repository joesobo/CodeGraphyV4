import { createLinkPipelines } from './link/pipeline';
import { createNodePipeline } from './node/pipeline';

export interface RendererResources {
  arrow: GPURenderPipeline;
  context: GPUCanvasContext;
  device: GPUDevice;
  link: GPURenderPipeline;
  node: GPURenderPipeline;
}

async function requestDevice(gpu: GPU): Promise<GPUDevice | undefined> {
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
    ?? await gpu.requestAdapter({ forceFallbackAdapter: true });
  return adapter?.requestDevice();
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
    device.pushErrorScope('validation');
    const node = createNodePipeline(device, format);
    const { arrow, link } = createLinkPipelines(device, format);
    const validationError = await device.popErrorScope();
    if (validationError) {
      throw new Error(`WebGPU pipeline validation failed: ${validationError.message}`);
    }
    return { arrow, context, device, link, node };
  } catch (error) {
    context?.unconfigure();
    device.destroy();
    throw error;
  }
}

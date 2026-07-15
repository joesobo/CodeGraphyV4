/// <reference types="@webgpu/types" />

import type { GraphRendererFrame } from '../contracts';
import {
  createGraphBufferState,
  destroyGraphBufferState,
  type GraphBufferState,
} from './bufferState';
import { CameraBuffer } from './cameraBuffer';
import { resizeGraphCanvas } from './canvasSize';
import { createRendererResources, type RendererResources } from './device';
import { FrameQueue } from './frameQueue';
import { updateGraphBuffers } from './graphBuffers';
import { submitRenderPass, type RenderPassResources } from './renderPass';
import { updateStyleCache } from './styleCache';

export { webGpuNodeShapeCode } from './node/style';

export type WebGpuGraphFrame = GraphRendererFrame;

export interface WebGpuGraphRendererOptions {
  onDeviceLost(this: void, message: string): void;
  onFrameComplete(this: void): void;
}

export class WebGpuGraphRenderer {
  private readonly buffers: GraphBufferState;
  private readonly camera: CameraBuffer;
  private readonly frameQueue: FrameQueue;
  private readonly passResources: RenderPassResources;
  private disposed = false;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly resources: RendererResources,
    onFrameComplete: () => void,
  ) {
    this.buffers = createGraphBufferState(resources.device);
    this.camera = new CameraBuffer(resources.device);
    this.frameQueue = new FrameQueue(resources.device, onFrameComplete);
    this.passResources = {
      ...resources,
      arrowCamera: this.camera.bind(resources.arrow, 'Graph arrow camera'),
      arrowPipeline: resources.arrow,
      linkCamera: this.camera.bind(resources.link, 'Graph link camera'),
      linkPipeline: resources.link,
      nodeCamera: this.camera.bind(resources.node, 'Graph node camera'),
      nodePipeline: resources.node,
    };
  }

  static async create(
    canvas: HTMLCanvasElement,
    options: WebGpuGraphRendererOptions,
  ): Promise<WebGpuGraphRenderer | undefined> {
    const resources = await createRendererResources(canvas);
    if (!resources) return undefined;
    const renderer = new WebGpuGraphRenderer(canvas, resources, options.onFrameComplete);
    void resources.device.lost.then(info => {
      if (info.reason !== 'destroyed') options.onDeviceLost(info.message);
    });
    return renderer;
  }

  canRender(): boolean {
    return this.frameQueue.canSubmit();
  }

  render(frame: WebGpuGraphFrame): void {
    if (!this.canRender()) throw new Error('WebGPU frame submitted while the frame queue is full');
    const styleUpdate = updateStyleCache(this.buffers, frame);
    resizeGraphCanvas(this.canvas, this.resources.device, frame);
    updateGraphBuffers(this.resources.device, this.buffers, frame, styleUpdate);
    this.camera.upload(frame, this.buffers);
    submitRenderPass(this.passResources, this.buffers, frame, this.camera.values[8]);
    this.frameQueue.trackSubmission();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.frameQueue.dispose();
    this.camera.buffer.destroy();
    destroyGraphBufferState(this.buffers);
    this.resources.context.unconfigure();
    this.resources.device.destroy();
  }
}

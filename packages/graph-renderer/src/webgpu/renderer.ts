/// <reference types="@webgpu/types" />

import type { GraphRendererFrame } from '../contracts';
import {
  createGraphBufferState,
  destroyGraphBufferState,
  type GraphBufferState,
} from './buffer/state';
import { CameraBuffer } from './buffer/camera';
import { updateGraphBuffers } from './buffer/graph';
import { resizeGraphCanvas } from './frame/canvas';
import { createRendererResources, type RendererResources } from './device';
import { submitRenderPass, type RenderPassResources } from './frame/pass';
import { FrameQueue } from './frame/queue';
import { updateStyleCache } from './styleCache';

export { webGpuNodeShapeCode } from './node/style/model';

export type WebGpuGraphFrame = GraphRendererFrame;

export interface WebGpuGraphRendererOptions {
  onDeviceLost(this: void, message: string): void;
  onFrameComplete(this: void, submissionId: number): void;
  onFrameRejected?(this: void, submissionId: number): void;
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
    onFrameComplete: (submissionId: number) => void,
    onFrameRejected: (submissionId: number) => void,
  ) {
    this.buffers = createGraphBufferState(resources.device);
    this.camera = new CameraBuffer(resources.device);
    this.frameQueue = new FrameQueue(resources.device, settlement => {
      if (settlement.succeeded) onFrameComplete(settlement.submissionId);
      else onFrameRejected(settlement.submissionId);
    });
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
    const renderer = new WebGpuGraphRenderer(
      canvas,
      resources,
      options.onFrameComplete,
      options.onFrameRejected ?? (() => {}),
    );
    void resources.device.lost.then(info => {
      if (info.reason !== 'destroyed') options.onDeviceLost(info.message);
    });
    return renderer;
  }

  canRender(): boolean {
    return this.frameQueue.canSubmit();
  }

  render(frame: WebGpuGraphFrame): number {
    if (!this.canRender()) throw new Error('WebGPU frame submitted while the frame queue is full');
    const styleUpdate = updateStyleCache(this.buffers, frame);
    resizeGraphCanvas(this.canvas, this.resources.device, frame);
    updateGraphBuffers(this.resources.device, this.buffers, frame, styleUpdate);
    this.camera.upload(frame, this.buffers);
    submitRenderPass(this.passResources, this.buffers, frame, this.camera.values[8]);
    return this.frameQueue.trackSubmission();
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

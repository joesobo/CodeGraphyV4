/// <reference types="@webgpu/types" />

import type { GraphRendererFrame, GraphRendererSecondaryFrame } from '../contracts';
import {
  createGraphBufferState,
  destroyGraphBufferState,
  type GraphBufferState,
} from './buffer/state';
import { CameraBuffer } from './buffer/camera';
import { updateGraphBuffers } from './buffer/graph';
import { validateGraphBufferLimits } from './buffer/limits';
import { resizeGraphCanvas } from './frame/canvas';
import { beginFrameValidation, endFrameValidation } from './frame/validation';
import { createRendererResources, type RendererResources } from './device';
import { encodeRenderPass, type RenderPassResources } from './frame/pass';
import { FrameQueue } from './frame/queue';
import { updateStyleCache } from './styleCache';
import {
  createSecondaryStyleBuffers,
  destroySecondaryStyleBuffers,
  type SecondaryStyleBuffers,
  updateSecondaryStyleBuffers,
} from './secondary/styles';

export { webGpuNodeShapeCode } from './node/style/model';

export type WebGpuGraphFrame = GraphRendererFrame;
export type WebGpuGraphSecondaryFrame = GraphRendererSecondaryFrame;

interface SecondarySurface {
  camera: CameraBuffer;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  passResources: RenderPassResources;
  styles: SecondaryStyleBuffers;
}

export interface WebGpuGraphRendererOptions {
  onDeviceLost(this: void, message: string): void;
  onFrameComplete(this: void, submissionId: number): void;
  onFrameRejected?(this: void, submissionId: number): void;
  onRendererError(this: void, message: string): void;
}

export class WebGpuGraphRenderer {
  private readonly buffers: GraphBufferState;
  private readonly camera: CameraBuffer;
  private readonly frameQueue: FrameQueue;
  private readonly passResources: RenderPassResources;
  private readonly uncapturedErrorListener: (event: GPUUncapturedErrorEvent) => void;
  private disposed = false;
  private secondaryRefreshCpuMs: number | undefined;
  private secondarySurface?: SecondarySurface;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly resources: RendererResources,
    onFrameComplete: (submissionId: number) => void,
    onFrameRejected: (submissionId: number) => void,
    onRendererError: (message: string) => void,
  ) {
    this.uncapturedErrorListener = event => {
      event.preventDefault();
      if (!this.disposed) {
        onRendererError(event.error.message || 'An uncaptured WebGPU error occurred.');
      }
    };
    resources.device.addEventListener('uncapturederror', this.uncapturedErrorListener);
    try {
      this.buffers = createGraphBufferState(resources.device);
      this.camera = new CameraBuffer(resources.device);
      this.frameQueue = new FrameQueue(resources.device, settlement => {
        if (settlement.error) {
          onRendererError(settlement.error.message || 'A WebGPU frame failed validation.');
        } else if (settlement.succeeded) {
          onFrameComplete(settlement.submissionId);
        } else {
          onFrameRejected(settlement.submissionId);
        }
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
    } catch (error) {
      resources.device.removeEventListener('uncapturederror', this.uncapturedErrorListener);
      resources.context.unconfigure();
      resources.device.destroy();
      throw error;
    }
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
      options.onRendererError,
    );
    void resources.device.lost.then(info => {
      if (info.reason !== 'destroyed') options.onDeviceLost(info.message);
    });
    return renderer;
  }

  canRender(): boolean {
    return this.frameQueue.canSubmit();
  }

  lastSecondaryRefreshCpuMs(): number | undefined {
    return this.secondaryRefreshCpuMs;
  }

  setSecondarySurface(canvas: HTMLCanvasElement | undefined): void {
    this.releaseSecondarySurface();
    if (!canvas) return;
    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU is unavailable for the secondary graph surface');
    this.secondarySurface = this.createSecondarySurface(canvas, context);
  }

  render(frame: WebGpuGraphFrame, secondaryFrame?: WebGpuGraphSecondaryFrame): number {
    this.secondaryRefreshCpuMs = undefined;
    if (!this.canRender()) throw new Error('WebGPU frame submitted while the frame queue is full');
    const device = this.resources.device;
    validateGraphBufferLimits(frame, device.limits.maxBufferSize);
    beginFrameValidation(device);
    try {
      const styleUpdate = updateStyleCache(this.buffers, frame);
      resizeGraphCanvas(this.canvas, device, frame);
      const graphUpdate = updateGraphBuffers(device, this.buffers, frame, styleUpdate);
      this.camera.upload(frame, this.buffers);
      const encoder = device.createCommandEncoder({ label: 'Graph frame' });
      encodeRenderPass(
        this.passResources,
        this.buffers,
        frame,
        this.camera.values[8],
        encoder,
        true,
      );
      const secondary = this.secondarySurface;
      if (secondary && secondaryFrame) {
        const secondaryStartedAt = performance.now();
        resizeGraphCanvas(secondary.canvas, device, secondaryFrame);
        secondary.camera.uploadSecondary(secondaryFrame);
        updateSecondaryStyleBuffers(
          device,
          secondary.styles,
          this.buffers,
          frame,
          secondaryFrame,
          styleUpdate.nodeOrderChanged || graphUpdate.linkOrderChanged,
        );
        encodeRenderPass(
          secondary.passResources,
          secondary.styles.pass,
          { ...frame, ...secondaryFrame, directionMode: 'none' },
          -1,
          encoder,
          false,
        );
        this.secondaryRefreshCpuMs = Math.max(0, performance.now() - secondaryStartedAt);
      }
      device.queue.submit([encoder.finish()]);
      return this.frameQueue.trackSubmission(endFrameValidation(device));
    } catch (error) {
      void endFrameValidation(device).catch(() => {});
      throw error;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resources.device.removeEventListener('uncapturederror', this.uncapturedErrorListener);
    this.frameQueue.dispose();
    this.releaseSecondarySurface();
    this.camera.buffer.destroy();
    destroyGraphBufferState(this.buffers);
    this.resources.context.unconfigure();
    this.resources.device.destroy();
  }

  private releaseSecondarySurface(): void {
    const secondary = this.secondarySurface;
    if (!secondary) return;
    this.secondarySurface = undefined;
    secondary.camera.buffer.destroy();
    destroySecondaryStyleBuffers(secondary.styles);
    secondary.context.unconfigure();
  }

  private createSecondarySurface(
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
  ): SecondarySurface {
    let camera: CameraBuffer | undefined;
    let styles: SecondaryStyleBuffers | undefined;
    try {
      context.configure({
        alphaMode: 'premultiplied',
        device: this.resources.device,
        format: this.resources.format,
      });
      camera = new CameraBuffer(this.resources.device, 'CodeGraphy secondary camera uniform');
      styles = createSecondaryStyleBuffers(this.resources.device, this.buffers);
      return {
        camera,
        canvas,
        context,
        passResources: {
          ...this.resources,
          context,
          arrowCamera: camera.bind(this.resources.arrow, 'Secondary graph arrow camera'),
          arrowPipeline: this.resources.arrow,
          linkCamera: camera.bind(this.resources.link, 'Secondary graph link camera'),
          linkPipeline: this.resources.link,
          nodeCamera: camera.bind(this.resources.node, 'Secondary graph node camera'),
          nodePipeline: this.resources.node,
        },
        styles,
      };
    } catch (error) {
      if (styles) destroySecondaryStyleBuffers(styles);
      camera?.buffer.destroy();
      context.unconfigure();
      throw error;
    }
  }
}

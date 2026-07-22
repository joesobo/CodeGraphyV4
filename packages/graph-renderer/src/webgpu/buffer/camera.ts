import { graphDetailOpacity } from '../../detailVisibility';
import type { GraphRendererFrame, GraphRendererSecondaryFrame } from '../../contracts';
import type { GraphBufferState } from './state';

export class CameraBuffer {
  readonly buffer: GPUBuffer;
  readonly values = new Float32Array(12);

  constructor(private readonly device: GPUDevice, label = 'CodeGraphy camera uniform') {
    this.buffer = device.createBuffer({
      label,
      size: this.values.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  bind(pipeline: GPURenderPipeline, label: string): GPUBindGroup {
    return this.device.createBindGroup({
      label,
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });
  }

  upload(frame: GraphRendererFrame, state: GraphBufferState): void {
    this.uploadPose(frame);
    this.values[6] = graphDetailOpacity(frame.camera.zoom);
    this.values[7] = frame.hoveredLink
      ? state.renderedLinkIndexByLink.get(frame.hoveredLink) ?? -1
      : -1;
    this.values[8] = frame.hoveredNodeIndex >= 0
      ? state.nodeStyles.order.renderedIndexByNodeIndex[frame.hoveredNodeIndex] ?? -1
      : -1;
    this.values[9] = frame.hoveredNodeScale;
    this.device.queue.writeBuffer(this.buffer, 0, this.values);
  }

  uploadSecondary(frame: GraphRendererSecondaryFrame): void {
    this.uploadPose(frame);
    this.values[6] = 0;
    this.values[7] = -1;
    this.values[8] = -1;
    this.values[9] = 1;
    this.device.queue.writeBuffer(this.buffer, 0, this.values);
  }

  private uploadPose(frame: GraphRendererSecondaryFrame): void {
    this.values[0] = frame.camera.centerX;
    this.values[1] = frame.camera.centerY;
    this.values[2] = frame.camera.zoom * 2 / frame.cssWidth;
    this.values[3] = frame.camera.zoom * 2 / frame.cssHeight;
    this.values[4] = 2 / frame.cssWidth;
    this.values[5] = 2 / frame.cssHeight;
  }
}

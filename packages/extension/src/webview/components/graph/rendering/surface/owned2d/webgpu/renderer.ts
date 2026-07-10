/// <reference types="@webgpu/types" />

import type { FGLink, FGNode } from '../../../../model/build';
import { graphToScreen, type OwnedGraphCamera } from '../camera';
import { LINK_SHADER, NODE_SHADER } from './shaders';

const NODE_FLOATS = 8;
const LINK_FLOATS = 10;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;

export interface OwnedWebGpuFrame {
  backgroundColor: string;
  camera: OwnedGraphCamera;
  cssHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  getLinkColor(this: void, link: FGLink): string;
  getLinkWidth(this: void, link: FGLink): number;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
}

export interface OwnedWebGpuRendererOptions {
  onDeviceLost(this: void, message: string): void;
}

function nextBufferSize(requiredBytes: number): number {
  let size = 256;
  while (size < requiredBytes) size *= 2;
  return size;
}

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16) / 255;
}

export function parseWebGpuColor(color: string): [number, number, number, number] {
  const value = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (short) {
    return [
      parseHexChannel(short[1] + short[1]),
      parseHexChannel(short[2] + short[2]),
      parseHexChannel(short[3] + short[3]),
      short[4] ? parseHexChannel(short[4] + short[4]) : 1,
    ];
  }
  const full = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (full) {
    return [
      parseHexChannel(full[1]),
      parseHexChannel(full[2]),
      parseHexChannel(full[3]),
      full[4] ? parseHexChannel(full[4]) : 1,
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(value);
  if (rgb) {
    return [
      Math.min(255, Number(rgb[1])) / 255,
      Math.min(255, Number(rgb[2])) / 255,
      Math.min(255, Number(rgb[3])) / 255,
      rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4])),
    ];
  }
  return [0, 0, 0, 1];
}

function endpointNode(endpoint: string | FGNode): FGNode | undefined {
  return typeof endpoint === 'string' ? undefined : endpoint;
}

function blendState(): GPUBlendState {
  return {
    color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
    alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
  };
}

export class OwnedWebGpuRenderer {
  private linkBuffer: GPUBuffer;
  private linkBufferSize = 256;
  private nodeBuffer: GPUBuffer;
  private nodeBufferSize = 256;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: GPUCanvasContext,
    private readonly device: GPUDevice,
    private readonly linkPipeline: GPURenderPipeline,
    private readonly nodePipeline: GPURenderPipeline,
  ) {
    this.linkBuffer = device.createBuffer({
      label: 'CodeGraphy link instances',
      size: this.linkBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.nodeBuffer = device.createBuffer({
      label: 'CodeGraphy node instances',
      size: this.nodeBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  static async create(
    canvas: HTMLCanvasElement,
    options: OwnedWebGpuRendererOptions,
  ): Promise<OwnedWebGpuRenderer | undefined> {
    const gpu = navigator.gpu;
    if (!gpu) return undefined;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return undefined;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return undefined;
    }

    const format = gpu.getPreferredCanvasFormat();
    context.configure({
      alphaMode: 'premultiplied',
      device,
      format,
    });
    device.pushErrorScope('validation');
    const nodeModule = device.createShaderModule({
      code: NODE_SHADER,
      label: 'CodeGraphy node shader',
    });
    const linkModule = device.createShaderModule({
      code: LINK_SHADER,
      label: 'CodeGraphy link shader',
    });
    const nodePipeline = device.createRenderPipeline({
      label: 'CodeGraphy node pipeline',
      layout: 'auto',
      vertex: {
        entryPoint: 'vertexMain',
        module: nodeModule,
        buffers: [{
          arrayStride: NODE_FLOATS * FLOAT_BYTES,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 2 * FLOAT_BYTES, format: 'float32x2' },
            { shaderLocation: 2, offset: 4 * FLOAT_BYTES, format: 'float32x4' },
          ],
        }],
      },
      fragment: {
        entryPoint: 'fragmentMain',
        module: nodeModule,
        targets: [{ format, blend: blendState() }],
      },
      primitive: { topology: 'triangle-list' },
    });
    const linkPipeline = device.createRenderPipeline({
      label: 'CodeGraphy link pipeline',
      layout: 'auto',
      vertex: {
        entryPoint: 'vertexMain',
        module: linkModule,
        buffers: [{
          arrayStride: LINK_FLOATS * FLOAT_BYTES,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 2 * FLOAT_BYTES, format: 'float32x2' },
            { shaderLocation: 2, offset: 4 * FLOAT_BYTES, format: 'float32x2' },
            { shaderLocation: 3, offset: 6 * FLOAT_BYTES, format: 'float32x4' },
          ],
        }],
      },
      fragment: {
        entryPoint: 'fragmentMain',
        module: linkModule,
        targets: [{ format, blend: blendState() }],
      },
      primitive: { topology: 'triangle-list' },
    });
    const validationError = await device.popErrorScope();
    if (validationError) {
      context.unconfigure();
      device.destroy();
      throw new Error(`WebGPU pipeline validation failed: ${validationError.message}`);
    }

    const renderer = new OwnedWebGpuRenderer(
      canvas,
      context,
      device,
      linkPipeline,
      nodePipeline,
    );
    void device.lost.then(info => {
      if (info.reason !== 'destroyed') options.onDeviceLost(info.message);
    });
    return renderer;
  }

  private ensureLinkBuffer(requiredBytes: number): void {
    if (requiredBytes <= this.linkBufferSize) return;
    this.linkBuffer.destroy();
    this.linkBufferSize = nextBufferSize(requiredBytes);
    this.linkBuffer = this.device.createBuffer({
      label: 'CodeGraphy link instances',
      size: this.linkBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private ensureNodeBuffer(requiredBytes: number): void {
    if (requiredBytes <= this.nodeBufferSize) return;
    this.nodeBuffer.destroy();
    this.nodeBufferSize = nextBufferSize(requiredBytes);
    this.nodeBuffer = this.device.createBuffer({
      label: 'CodeGraphy node instances',
      size: this.nodeBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  render(frame: OwnedWebGpuFrame): void {
    const pixelWidth = Math.max(1, Math.round(frame.cssWidth * frame.devicePixelRatio));
    const pixelHeight = Math.max(1, Math.round(frame.cssHeight * frame.devicePixelRatio));
    const maxDimension = this.device.limits.maxTextureDimension2D;
    this.canvas.width = Math.min(pixelWidth, maxDimension);
    this.canvas.height = Math.min(pixelHeight, maxDimension);

    const nodeValues = new Float32Array(frame.nodes.length * NODE_FLOATS);
    frame.nodes.forEach((node, index) => {
      const screen = graphToScreen(
        frame.camera,
        frame.cssWidth,
        frame.cssHeight,
        node.x ?? 0,
        node.y ?? 0,
      );
      const offset = index * NODE_FLOATS;
      const radius = Math.max(1, node.size ?? 4) * frame.camera.zoom;
      nodeValues[offset] = (screen.x / frame.cssWidth) * 2 - 1;
      nodeValues[offset + 1] = 1 - (screen.y / frame.cssHeight) * 2;
      nodeValues[offset + 2] = (radius / frame.cssWidth) * 2;
      nodeValues[offset + 3] = (radius / frame.cssHeight) * 2;
      nodeValues.set(parseWebGpuColor(node.color), offset + 4);
    });

    const linkValues = new Float32Array(frame.links.length * LINK_FLOATS);
    let renderedLinkCount = 0;
    for (const link of frame.links) {
      const source = endpointNode(link.source);
      const target = endpointNode(link.target);
      if (!source || !target) continue;
      const sourceScreen = graphToScreen(
        frame.camera,
        frame.cssWidth,
        frame.cssHeight,
        source.x ?? 0,
        source.y ?? 0,
      );
      const targetScreen = graphToScreen(
        frame.camera,
        frame.cssWidth,
        frame.cssHeight,
        target.x ?? 0,
        target.y ?? 0,
      );
      const offset = renderedLinkCount * LINK_FLOATS;
      const halfWidth = Math.max(0.35, frame.getLinkWidth(link) / 2);
      linkValues[offset] = (sourceScreen.x / frame.cssWidth) * 2 - 1;
      linkValues[offset + 1] = 1 - (sourceScreen.y / frame.cssHeight) * 2;
      linkValues[offset + 2] = (targetScreen.x / frame.cssWidth) * 2 - 1;
      linkValues[offset + 3] = 1 - (targetScreen.y / frame.cssHeight) * 2;
      linkValues[offset + 4] = (halfWidth / frame.cssWidth) * 2;
      linkValues[offset + 5] = (halfWidth / frame.cssHeight) * 2;
      linkValues.set(parseWebGpuColor(frame.getLinkColor(link)), offset + 6);
      renderedLinkCount += 1;
    }

    const nodeBytes = nodeValues.byteLength;
    const linkBytes = renderedLinkCount * LINK_FLOATS * FLOAT_BYTES;
    this.ensureNodeBuffer(nodeBytes);
    this.ensureLinkBuffer(linkBytes);
    if (nodeBytes > 0) this.device.queue.writeBuffer(this.nodeBuffer, 0, nodeValues);
    if (linkBytes > 0) {
      this.device.queue.writeBuffer(
        this.linkBuffer,
        0,
        linkValues.buffer,
        linkValues.byteOffset,
        linkBytes,
      );
    }

    const encoder = this.device.createCommandEncoder({ label: 'CodeGraphy graph frame' });
    const pass = encoder.beginRenderPass({
      label: 'CodeGraphy graph render pass',
      colorAttachments: [{
        clearValue: parseWebGpuColor(frame.backgroundColor),
        loadOp: 'clear',
        storeOp: 'store',
        view: this.context.getCurrentTexture().createView(),
      }],
    });
    if (renderedLinkCount > 0) {
      pass.setPipeline(this.linkPipeline);
      pass.setVertexBuffer(0, this.linkBuffer);
      pass.draw(6, renderedLinkCount);
    }
    if (frame.nodes.length > 0) {
      pass.setPipeline(this.nodePipeline);
      pass.setVertexBuffer(0, this.nodeBuffer);
      pass.draw(6, frame.nodes.length);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.linkBuffer.destroy();
    this.nodeBuffer.destroy();
    this.context.unconfigure();
    this.device.destroy();
  }
}

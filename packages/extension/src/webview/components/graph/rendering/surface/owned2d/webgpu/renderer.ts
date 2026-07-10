/// <reference types="@webgpu/types" />

import type { FGLink, FGNode } from '../../../../model/build';
import type { OwnedGraphCamera } from '../camera';
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

const colorCache = new Map<string, readonly [number, number, number, number]>();

function cachedWebGpuColor(color: string): readonly [number, number, number, number] {
  const cached = colorCache.get(color);
  if (cached) return cached;
  const parsed = parseWebGpuColor(color);
  colorCache.set(color, parsed);
  return parsed;
}

function blendState(): GPUBlendState {
  return {
    color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
    alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
  };
}

export class OwnedWebGpuRenderer {
  private coloredNodes: readonly FGNode[] | undefined;
  private linkBuffer: GPUBuffer;
  private linkBufferSize = 256;
  private linkColorAccessor: OwnedWebGpuFrame['getLinkColor'] | undefined;
  private linkStyleLinks: readonly FGLink[] | undefined;
  private linkStyles = new Float32Array();
  private linkValues = new Float32Array();
  private linkWidthAccessor: OwnedWebGpuFrame['getLinkWidth'] | undefined;
  private nodeBuffer: GPUBuffer;
  private nodeBufferSize = 256;
  private nodeColors = new Float32Array();
  private nodeValues = new Float32Array();

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

  private updateStyleCaches(frame: OwnedWebGpuFrame): void {
    if (this.coloredNodes !== frame.nodes || this.nodeColors.length !== frame.nodes.length * 4) {
      this.coloredNodes = frame.nodes;
      this.nodeColors = new Float32Array(frame.nodes.length * 4);
      for (let index = 0; index < frame.nodes.length; index += 1) {
        this.nodeColors.set(cachedWebGpuColor(frame.nodes[index].color), index * 4);
      }
    }
    if (
      this.linkStyleLinks === frame.links
      && this.linkColorAccessor === frame.getLinkColor
      && this.linkWidthAccessor === frame.getLinkWidth
      && this.linkStyles.length === frame.links.length * 5
    ) return;
    this.linkStyleLinks = frame.links;
    this.linkColorAccessor = frame.getLinkColor;
    this.linkWidthAccessor = frame.getLinkWidth;
    this.linkStyles = new Float32Array(frame.links.length * 5);
    for (let index = 0; index < frame.links.length; index += 1) {
      const link = frame.links[index];
      const offset = index * 5;
      this.linkStyles[offset] = Math.max(0.35, frame.getLinkWidth(link) / 2);
      this.linkStyles.set(cachedWebGpuColor(frame.getLinkColor(link)), offset + 1);
    }
  }

  render(frame: OwnedWebGpuFrame): void {
    this.updateStyleCaches(frame);
    const pixelWidth = Math.max(1, Math.round(frame.cssWidth * frame.devicePixelRatio));
    const pixelHeight = Math.max(1, Math.round(frame.cssHeight * frame.devicePixelRatio));
    const maxDimension = this.device.limits.maxTextureDimension2D;
    const width = Math.min(pixelWidth, maxDimension);
    const height = Math.min(pixelHeight, maxDimension);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    const requiredNodeFloats = frame.nodes.length * NODE_FLOATS;
    if (this.nodeValues.length !== requiredNodeFloats) {
      this.nodeValues = new Float32Array(requiredNodeFloats);
    }
    const nodeValues = this.nodeValues;
    const graphToClipX = frame.camera.zoom * 2 / frame.cssWidth;
    const graphToClipY = frame.camera.zoom * 2 / frame.cssHeight;
    for (let index = 0; index < frame.nodes.length; index += 1) {
      const node = frame.nodes[index];
      const offset = index * NODE_FLOATS;
      const radius = Math.max(1, node.size ?? 4) * frame.camera.zoom;
      nodeValues[offset] = ((node.x ?? 0) - frame.camera.centerX) * graphToClipX;
      nodeValues[offset + 1] = -((node.y ?? 0) - frame.camera.centerY) * graphToClipY;
      nodeValues[offset + 2] = (radius / frame.cssWidth) * 2;
      nodeValues[offset + 3] = (radius / frame.cssHeight) * 2;
      const colorOffset = index * 4;
      nodeValues[offset + 4] = this.nodeColors[colorOffset];
      nodeValues[offset + 5] = this.nodeColors[colorOffset + 1];
      nodeValues[offset + 6] = this.nodeColors[colorOffset + 2];
      nodeValues[offset + 7] = this.nodeColors[colorOffset + 3];
    }

    const requiredLinkFloats = frame.links.length * LINK_FLOATS;
    if (this.linkValues.length !== requiredLinkFloats) {
      this.linkValues = new Float32Array(requiredLinkFloats);
    }
    const linkValues = this.linkValues;
    let renderedLinkCount = 0;
    for (let linkIndex = 0; linkIndex < frame.links.length; linkIndex += 1) {
      const link = frame.links[linkIndex];
      const source = endpointNode(link.source);
      const target = endpointNode(link.target);
      if (!source || !target) continue;
      const offset = renderedLinkCount * LINK_FLOATS;
      const styleOffset = linkIndex * 5;
      const halfWidth = this.linkStyles[styleOffset];
      linkValues[offset] = ((source.x ?? 0) - frame.camera.centerX) * graphToClipX;
      linkValues[offset + 1] = -((source.y ?? 0) - frame.camera.centerY) * graphToClipY;
      linkValues[offset + 2] = ((target.x ?? 0) - frame.camera.centerX) * graphToClipX;
      linkValues[offset + 3] = -((target.y ?? 0) - frame.camera.centerY) * graphToClipY;
      linkValues[offset + 4] = (halfWidth / frame.cssWidth) * 2;
      linkValues[offset + 5] = (halfWidth / frame.cssHeight) * 2;
      linkValues[offset + 6] = this.linkStyles[styleOffset + 1];
      linkValues[offset + 7] = this.linkStyles[styleOffset + 2];
      linkValues[offset + 8] = this.linkStyles[styleOffset + 3];
      linkValues[offset + 9] = this.linkStyles[styleOffset + 4];
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
        clearValue: cachedWebGpuColor(frame.backgroundColor),
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

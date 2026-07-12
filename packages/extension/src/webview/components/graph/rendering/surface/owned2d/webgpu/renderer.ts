/// <reference types="@webgpu/types" />

import type { DirectionMode, NodeShape2D } from '../../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../../model/build';
import type { OwnedGraphNodeStyle } from '../contracts';
import type { OwnedGraphCamera } from '../camera';
import { LINK_SHADER, NODE_SHADER } from './shaders';

const NODE_FLOATS = 14;
const NODE_STYLE_FLOATS = 12;
const LINK_FLOATS = 15;
const LINK_STYLE_FLOATS = 9;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;

export interface OwnedWebGpuFrame {
  backgroundColor: string;
  camera: OwnedGraphCamera;
  cssHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  directionMode: DirectionMode;
  getArrowColor(this: void, link: FGLink): string;
  getLinkColor(this: void, link: FGLink): string;
  getLinkWidth(this: void, link: FGLink): number;
  getNodeStyle(this: void, node: FGNode): OwnedGraphNodeStyle;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  positionVersion: number;
  styleVersion: number;
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
  if (value.toLowerCase() === 'transparent') return [0, 0, 0, 0];
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

export function webGpuNodeShapeCode(shape: NodeShape2D): number {
  switch (shape) {
    case 'circle': return 0;
    case 'square': return 1;
    case 'rectangle': return 2;
    case 'diamond': return 3;
    case 'triangle': return 4;
    case 'hexagon': return 5;
    case 'star': return 6;
  }
}

function endpointNode(endpoint: string | FGNode): FGNode | undefined {
  return typeof endpoint === 'string' ? undefined : endpoint;
}

const colorCache = new Map<string, readonly [number, number, number, number]>();
const MAX_CACHED_COLORS = 1_024;

function cachedWebGpuColor(color: string): readonly [number, number, number, number] {
  const cached = colorCache.get(color);
  if (cached) return cached;
  const parsed = parseWebGpuColor(color);
  if (colorCache.size >= MAX_CACHED_COLORS) colorCache.clear();
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
  private readonly cameraBuffer: GPUBuffer;
  private readonly cameraValues = new Float32Array(8);
  private styledNodes: readonly FGNode[] | undefined;
  private linkBuffer: GPUBuffer;
  private linkArrowColorAccessor: OwnedWebGpuFrame['getArrowColor'] | undefined;
  private linkBufferSize = 256;
  private linkColorAccessor: OwnedWebGpuFrame['getLinkColor'] | undefined;
  private linkStyleLinks: readonly FGLink[] | undefined;
  private linkStyles = new Float32Array();
  private linkValues = new Float32Array();
  private linkWidthAccessor: OwnedWebGpuFrame['getLinkWidth'] | undefined;
  private readonly linkCameraBindGroup: GPUBindGroup;
  private nodeBuffer: GPUBuffer;
  private nodeBufferSize = 256;
  private nodeStyles = new Float32Array();
  private readonly nodeCameraBindGroup: GPUBindGroup;
  private nodeValues = new Float32Array();
  private renderedLinkCount = 0;
  private uploadedEdgeStride = 1;
  private uploadedLinks: readonly FGLink[] | undefined;
  private uploadedNodes: readonly FGNode[] | undefined;
  private uploadedPositionVersion = -1;
  private uploadedStyleVersion = -1;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: GPUCanvasContext,
    private readonly device: GPUDevice,
    private readonly linkPipeline: GPURenderPipeline,
    private readonly nodePipeline: GPURenderPipeline,
  ) {
    this.cameraBuffer = device.createBuffer({
      label: 'CodeGraphy camera uniform',
      size: this.cameraValues.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.linkCameraBindGroup = device.createBindGroup({
      label: 'CodeGraphy link camera bind group',
      layout: linkPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }],
    });
    this.nodeCameraBindGroup = device.createBindGroup({
      label: 'CodeGraphy node camera bind group',
      layout: nodePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }],
    });
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
            { shaderLocation: 3, offset: 8 * FLOAT_BYTES, format: 'float32x4' },
            { shaderLocation: 4, offset: 12 * FLOAT_BYTES, format: 'float32x2' },
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
            { shaderLocation: 4, offset: 10 * FLOAT_BYTES, format: 'float32x4' },
            { shaderLocation: 5, offset: 14 * FLOAT_BYTES, format: 'float32' },
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

  private updateStyleCaches(frame: OwnedWebGpuFrame): boolean {
    if (
      this.uploadedStyleVersion === frame.styleVersion
      && this.styledNodes === frame.nodes
      && this.linkStyleLinks === frame.links
      && this.linkArrowColorAccessor === frame.getArrowColor
      && this.linkColorAccessor === frame.getLinkColor
      && this.linkWidthAccessor === frame.getLinkWidth
    ) return false;

    this.uploadedStyleVersion = frame.styleVersion;
    this.styledNodes = frame.nodes;
    this.nodeStyles = new Float32Array(frame.nodes.length * NODE_STYLE_FLOATS);
    for (let index = 0; index < frame.nodes.length; index += 1) {
      const style = frame.getNodeStyle(frame.nodes[index]);
      const offset = index * NODE_STYLE_FLOATS;
      const fill = cachedWebGpuColor(style.fillColor);
      const border = cachedWebGpuColor(style.borderColor);
      this.nodeStyles[offset] = Math.max(0.5, style.width / 2);
      this.nodeStyles[offset + 1] = Math.max(0.5, style.height / 2);
      this.nodeStyles.set(fill, offset + 2);
      this.nodeStyles[offset + 5] *= style.opacity * style.fillOpacity;
      this.nodeStyles.set(border, offset + 6);
      this.nodeStyles[offset + 9] *= style.opacity;
      this.nodeStyles[offset + 10] = webGpuNodeShapeCode(style.shape);
      this.nodeStyles[offset + 11] = Math.max(0, style.borderWidth);
    }

    this.linkStyleLinks = frame.links;
    this.linkArrowColorAccessor = frame.getArrowColor;
    this.linkColorAccessor = frame.getLinkColor;
    this.linkWidthAccessor = frame.getLinkWidth;
    this.linkStyles = new Float32Array(frame.links.length * LINK_STYLE_FLOATS);
    for (let index = 0; index < frame.links.length; index += 1) {
      const link = frame.links[index];
      const offset = index * LINK_STYLE_FLOATS;
      this.linkStyles[offset] = Math.max(0.35, frame.getLinkWidth(link) / 2);
      this.linkStyles.set(cachedWebGpuColor(frame.getLinkColor(link)), offset + 1);
      this.linkStyles.set(cachedWebGpuColor(frame.getArrowColor(link)), offset + 5);
    }
    return true;
  }

  render(frame: OwnedWebGpuFrame): void {
    const stylesChanged = this.updateStyleCaches(frame);
    const pixelWidth = Math.max(1, Math.round(frame.cssWidth * frame.devicePixelRatio));
    const pixelHeight = Math.max(1, Math.round(frame.cssHeight * frame.devicePixelRatio));
    const maxDimension = this.device.limits.maxTextureDimension2D;
    const width = Math.min(pixelWidth, maxDimension);
    const height = Math.min(pixelHeight, maxDimension);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    this.cameraValues[0] = frame.camera.centerX;
    this.cameraValues[1] = frame.camera.centerY;
    this.cameraValues[2] = frame.camera.zoom * 2 / frame.cssWidth;
    this.cameraValues[3] = frame.camera.zoom * 2 / frame.cssHeight;
    this.cameraValues[4] = 2 / frame.cssWidth;
    this.cameraValues[5] = 2 / frame.cssHeight;
    this.device.queue.writeBuffer(this.cameraBuffer, 0, this.cameraValues);

    const edgeStride = frame.links.length > 250_000 && frame.camera.zoom < 0.5 ? 2 : 1;
    const graphChanged = stylesChanged
      || this.uploadedEdgeStride !== edgeStride
      || this.uploadedPositionVersion !== frame.positionVersion
      || this.uploadedNodes !== frame.nodes
      || this.uploadedLinks !== frame.links;
    if (graphChanged) {
      const requiredNodeFloats = frame.nodes.length * NODE_FLOATS;
      if (this.nodeValues.length !== requiredNodeFloats) {
        this.nodeValues = new Float32Array(requiredNodeFloats);
      }
      for (let index = 0; index < frame.nodes.length; index += 1) {
        const node = frame.nodes[index];
        const offset = index * NODE_FLOATS;
        this.nodeValues[offset] = node.x ?? 0;
        this.nodeValues[offset + 1] = node.y ?? 0;
        const styleOffset = index * NODE_STYLE_FLOATS;
        this.nodeValues.set(
          this.nodeStyles.subarray(styleOffset, styleOffset + NODE_STYLE_FLOATS),
          offset + 2,
        );
      }

      const requiredLinkFloats = frame.links.length * LINK_FLOATS;
      if (this.linkValues.length !== requiredLinkFloats) {
        this.linkValues = new Float32Array(requiredLinkFloats);
      }
      this.renderedLinkCount = 0;
      for (let linkIndex = 0; linkIndex < frame.links.length; linkIndex += edgeStride) {
        const link = frame.links[linkIndex];
        const source = endpointNode(link.source);
        const target = endpointNode(link.target);
        if (!source || !target) continue;
        const offset = this.renderedLinkCount * LINK_FLOATS;
        const styleOffset = linkIndex * LINK_STYLE_FLOATS;
        this.linkValues[offset] = source.x ?? 0;
        this.linkValues[offset + 1] = source.y ?? 0;
        this.linkValues[offset + 2] = target.x ?? 0;
        this.linkValues[offset + 3] = target.y ?? 0;
        this.linkValues[offset + 4] = this.linkStyles[styleOffset];
        this.linkValues[offset + 5] = link.curvature ?? 0;
        this.linkValues[offset + 6] = this.linkStyles[styleOffset + 1];
        this.linkValues[offset + 7] = this.linkStyles[styleOffset + 2];
        this.linkValues[offset + 8] = this.linkStyles[styleOffset + 3];
        this.linkValues[offset + 9] = this.linkStyles[styleOffset + 4];
        this.linkValues[offset + 10] = this.linkStyles[styleOffset + 5];
        this.linkValues[offset + 11] = this.linkStyles[styleOffset + 6];
        this.linkValues[offset + 12] = this.linkStyles[styleOffset + 7];
        this.linkValues[offset + 13] = this.linkStyles[styleOffset + 8];
        this.linkValues[offset + 14] = link.bidirectional ? 1 : 0;
        this.renderedLinkCount += 1;
      }

      const nodeBytes = this.nodeValues.byteLength;
      const linkBytes = this.renderedLinkCount * LINK_FLOATS * FLOAT_BYTES;
      this.ensureNodeBuffer(nodeBytes);
      this.ensureLinkBuffer(linkBytes);
      if (nodeBytes > 0) this.device.queue.writeBuffer(this.nodeBuffer, 0, this.nodeValues);
      if (linkBytes > 0) {
        this.device.queue.writeBuffer(
          this.linkBuffer,
          0,
          this.linkValues.buffer,
          this.linkValues.byteOffset,
          linkBytes,
        );
      }
      this.uploadedEdgeStride = edgeStride;
      this.uploadedPositionVersion = frame.positionVersion;
      this.uploadedNodes = frame.nodes;
      this.uploadedLinks = frame.links;
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
    if (this.renderedLinkCount > 0) {
      pass.setPipeline(this.linkPipeline);
      pass.setBindGroup(0, this.linkCameraBindGroup);
      pass.setVertexBuffer(0, this.linkBuffer);
      pass.draw(frame.directionMode === 'arrows' ? 30 : 24, this.renderedLinkCount);
    }
    if (frame.nodes.length > 0) {
      pass.setPipeline(this.nodePipeline);
      pass.setBindGroup(0, this.nodeCameraBindGroup);
      pass.setVertexBuffer(0, this.nodeBuffer);
      pass.draw(6, frame.nodes.length);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.cameraBuffer.destroy();
    this.linkBuffer.destroy();
    this.nodeBuffer.destroy();
    this.context.unconfigure();
    this.device.destroy();
  }
}

/// <reference types="@webgpu/types" />

import {
  GRAPH_EDGE_HOVER_MIN_ZOOM,
  graphDetailOpacity,
} from '../detailVisibility';
import type {
  GraphNodeShape,
  GraphRendererFrame,
  GraphRendererLink,
  GraphRendererNode,
  GraphRendererNodeStyle,
} from '../contracts';
import { writeOwnedArrowCurveParameters } from './arrowGeometry';
import { ownedGraphNodeWorldScale } from '../visualSize';
import { LINK_SHADER, NODE_SHADER, OWNED_LINK_SEGMENTS } from './shaders';

const NODE_POSITION_FLOATS = 2;
const NODE_STYLE_FLOATS = 13;
const LINK_GEOMETRY_FLOATS = 6;
const LINK_CACHED_STYLE_FLOATS = 9;
const LINK_INSTANCE_STYLE_FLOATS = 11;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
// Bound queue growth while allowing triple-buffered compositors to overlap work.
const MAX_PENDING_FRAMES = 3;

export type OwnedWebGpuFrame = GraphRendererFrame;

export interface OwnedWebGpuRendererOptions {
  onDeviceLost(this: void, message: string): void;
  onFrameComplete(this: void): void;
}

function nextBufferSize(requiredBytes: number): number {
  let size = 256;
  while (size < requiredBytes) size *= 2;
  return size;
}

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16) / 255;
}

type WebGpuColor = [number, number, number, number];

function parseShortHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1] + match[1]),
    parseHexChannel(match[2] + match[2]),
    parseHexChannel(match[3] + match[3]),
    match[4] ? parseHexChannel(match[4] + match[4]) : 1,
  ];
}

function parseFullHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1]),
    parseHexChannel(match[2]),
    parseHexChannel(match[3]),
    match[4] ? parseHexChannel(match[4]) : 1,
  ];
}

function parseRgbColor(value: string): WebGpuColor | null {
  const match = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(value);
  if (!match) return null;
  return [
    Math.min(255, Number(match[1])) / 255,
    Math.min(255, Number(match[2])) / 255,
    Math.min(255, Number(match[3])) / 255,
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}

function parseSrgbColor(value: string): WebGpuColor | null {
  const match = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i.exec(value);
  if (!match) return null;
  return [
    Math.min(1, Number(match[1])),
    Math.min(1, Number(match[2])),
    Math.min(1, Number(match[3])),
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}

export function parseWebGpuColor(color: string): WebGpuColor {
  const value = color.trim();
  if (value.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  return parseShortHexColor(value)
    ?? parseFullHexColor(value)
    ?? parseRgbColor(value)
    ?? parseSrgbColor(value)
    ?? [0, 0, 0, 1];
}

export function webGpuNodeShapeCode(shape: GraphNodeShape): number {
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

function linkVertexBuffers(): GPUVertexBufferLayout[] {
  return [{
    arrayStride: LINK_GEOMETRY_FLOATS * FLOAT_BYTES,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x2' },
      { shaderLocation: 1, offset: 2 * FLOAT_BYTES, format: 'float32x2' },
      { shaderLocation: 5, offset: 4 * FLOAT_BYTES, format: 'float32x2' },
    ],
  }, {
    arrayStride: LINK_INSTANCE_STYLE_FLOATS * FLOAT_BYTES,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 2, offset: 0, format: 'float32x2' },
      { shaderLocation: 3, offset: 2 * FLOAT_BYTES, format: 'float32x4' },
      { shaderLocation: 4, offset: 6 * FLOAT_BYTES, format: 'float32x4' },
      { shaderLocation: 6, offset: 10 * FLOAT_BYTES, format: 'float32' },
    ],
  }];
}

interface VertexStream {
  buffer: GPUBuffer;
  capacity: number;
  readonly label: string;
}

function createVertexStream(device: GPUDevice, label: string): VertexStream {
  return {
    buffer: device.createBuffer({
      label,
      size: 256,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    }),
    capacity: 256,
    label,
  };
}

export class OwnedWebGpuRenderer {
  private readonly arrowCameraBindGroup: GPUBindGroup;
  private readonly cameraBuffer: GPUBuffer;
  private readonly cameraValues = new Float32Array(12);
  private styledNodes: readonly GraphRendererNode[] | undefined;
  private linkArrowColorAccessor: OwnedWebGpuFrame['getArrowColor'] | undefined;
  private linkColorAccessor: OwnedWebGpuFrame['getLinkColor'] | undefined;
  private linkOpacityAccessor: OwnedWebGpuFrame['getLinkOpacity'] | undefined;
  private readonly linkGeometryStream: VertexStream;
  private linkGeometryValues = new Float32Array();
  private linkStyleLinks: readonly GraphRendererLink[] | undefined;
  private readonly linkStyleStream: VertexStream;
  private linkStyles = new Float32Array();
  private linkStyleValues = new Float32Array();
  private linkWidthAccessor: OwnedWebGpuFrame['getLinkWidth'] | undefined;
  private readonly linkCameraBindGroup: GPUBindGroup;
  private nodePositionValues = new Float32Array();
  private readonly nodePositionStream: VertexStream;
  private nodeStylesByIndex: GraphRendererNodeStyle[] = [];
  private readonly nodeStyleStream: VertexStream;
  private nodeStyles = new Float32Array();
  private readonly nodeCameraBindGroup: GPUBindGroup;
  private renderedLinkCount = 0;
  private renderedLinkIndexByLink = new WeakMap<GraphRendererLink, number>();
  private uploadedArrowsVisible = false;
  private uploadedEdgeStride = 1;
  private uploadedNodeVisualScale = 1;
  private uploadedLinks: readonly GraphRendererLink[] | undefined;
  private uploadedNodes: readonly GraphRendererNode[] | undefined;
  private uploadedPositionVersion = -1;
  private uploadedStyleVersion = -1;
  private pendingFrameCount = 0;
  private disposed = false;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: GPUCanvasContext,
    private readonly device: GPUDevice,
    private readonly arrowPipeline: GPURenderPipeline,
    private readonly linkPipeline: GPURenderPipeline,
    private readonly nodePipeline: GPURenderPipeline,
    private readonly onFrameComplete: () => void,
  ) {
    this.cameraBuffer = device.createBuffer({
      label: 'CodeGraphy camera uniform',
      size: this.cameraValues.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.arrowCameraBindGroup = device.createBindGroup({
      label: 'CodeGraphy arrow camera bind group',
      layout: arrowPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }],
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
    this.linkGeometryStream = createVertexStream(device, 'CodeGraphy link geometry');
    this.linkStyleStream = createVertexStream(device, 'CodeGraphy link styles');
    this.nodePositionStream = createVertexStream(device, 'CodeGraphy node positions');
    this.nodeStyleStream = createVertexStream(device, 'CodeGraphy node styles');
  }

  static async create(
    canvas: HTMLCanvasElement,
    options: OwnedWebGpuRendererOptions,
  ): Promise<OwnedWebGpuRenderer | undefined> {
    const gpu = navigator.gpu;
    if (!gpu) return undefined;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
      ?? await gpu.requestAdapter({ forceFallbackAdapter: true });
    if (!adapter) return undefined;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return undefined;
    }

    try {
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
          arrayStride: NODE_POSITION_FLOATS * FLOAT_BYTES,
          stepMode: 'instance',
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }, {
          arrayStride: NODE_STYLE_FLOATS * FLOAT_BYTES,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 1, offset: 0, format: 'float32x2' },
            { shaderLocation: 2, offset: 2 * FLOAT_BYTES, format: 'float32x4' },
            { shaderLocation: 3, offset: 6 * FLOAT_BYTES, format: 'float32x4' },
            { shaderLocation: 4, offset: 10 * FLOAT_BYTES, format: 'float32x3' },
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
        entryPoint: 'linkVertexMain',
        module: linkModule,
        buffers: linkVertexBuffers(),
      },
      fragment: {
        entryPoint: 'linkFragmentMain',
        module: linkModule,
        targets: [{ format, blend: blendState() }],
      },
      primitive: { topology: 'triangle-strip' },
    });
    const arrowPipeline = device.createRenderPipeline({
      label: 'CodeGraphy arrow pipeline',
      layout: 'auto',
      vertex: {
        entryPoint: 'arrowVertexMain',
        module: linkModule,
        buffers: linkVertexBuffers(),
      },
      fragment: {
        entryPoint: 'arrowFragmentMain',
        module: linkModule,
        targets: [{ format, blend: blendState() }],
      },
      primitive: { topology: 'triangle-list' },
    });
    const validationError = await device.popErrorScope();
      if (validationError) {
        throw new Error(`WebGPU pipeline validation failed: ${validationError.message}`);
      }

    const renderer = new OwnedWebGpuRenderer(
      canvas,
      context,
      device,
      arrowPipeline,
      linkPipeline,
      nodePipeline,
      options.onFrameComplete,
    );
      void device.lost.then(info => {
        if (info.reason !== 'destroyed') options.onDeviceLost(info.message);
      });
      return renderer;
    } catch (error) {
      context.unconfigure();
      device.destroy();
      throw error;
    }
  }

  private ensureVertexStream(stream: VertexStream, requiredBytes: number): void {
    if (requiredBytes <= stream.capacity) return;
    stream.buffer.destroy();
    stream.capacity = nextBufferSize(requiredBytes);
    stream.buffer = this.device.createBuffer({
      label: stream.label,
      size: stream.capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private styleCachesMatch(frame: OwnedWebGpuFrame): boolean {
    return this.uploadedStyleVersion === frame.styleVersion
      && this.styledNodes === frame.nodes
      && this.linkStyleLinks === frame.links
      && this.linkArrowColorAccessor === frame.getArrowColor
      && this.linkColorAccessor === frame.getLinkColor
      && this.linkOpacityAccessor === frame.getLinkOpacity
      && this.linkWidthAccessor === frame.getLinkWidth;
  }

  private writeNodeStyle(index: number, style: GraphRendererNodeStyle): void {
    const offset = index * NODE_STYLE_FLOATS;
    this.nodeStyles[offset] = Math.max(0.5, style.width / 2);
    this.nodeStyles[offset + 1] = Math.max(0.5, style.height / 2);
    this.nodeStyles.set(cachedWebGpuColor(style.fillColor), offset + 2);
    this.nodeStyles[offset + 5] *= style.opacity * style.fillOpacity;
    this.nodeStyles.set(cachedWebGpuColor(style.borderColor), offset + 6);
    this.nodeStyles[offset + 9] *= style.opacity;
    this.nodeStyles[offset + 10] = webGpuNodeShapeCode(style.shape);
    this.nodeStyles[offset + 11] = Math.max(0, style.borderWidth);
    this.nodeStyles[offset + 12] = Math.max(0, style.cornerRadius);
  }

  private updateNodeStyleCache(frame: OwnedWebGpuFrame): void {
    this.uploadedStyleVersion = frame.styleVersion;
    this.styledNodes = frame.nodes;
    this.nodeStylesByIndex = new Array<GraphRendererNodeStyle>(frame.nodes.length);
    this.nodeStyles = new Float32Array(frame.nodes.length * NODE_STYLE_FLOATS);
    for (let index = 0; index < frame.nodes.length; index += 1) {
      const style = frame.getNodeStyle(frame.nodes[index]);
      this.nodeStylesByIndex[index] = style;
      this.writeNodeStyle(index, style);
    }
  }

  private writeLinkStyle(frame: OwnedWebGpuFrame, index: number): void {
    const link = frame.links[index];
    const offset = index * LINK_CACHED_STYLE_FLOATS;
    this.linkStyles[offset] = Math.max(0.35, frame.getLinkWidth(link) / 2);
    this.linkStyles.set(cachedWebGpuColor(frame.getLinkColor(link)), offset + 1);
    this.linkStyles[offset + 4] *= Math.max(0, Math.min(1, frame.getLinkOpacity(link)));
    this.linkStyles.set(cachedWebGpuColor(frame.getArrowColor(link)), offset + 5);
  }

  private updateLinkStyleCache(frame: OwnedWebGpuFrame): void {
    this.linkStyleLinks = frame.links;
    this.linkArrowColorAccessor = frame.getArrowColor;
    this.linkColorAccessor = frame.getLinkColor;
    this.linkOpacityAccessor = frame.getLinkOpacity;
    this.linkWidthAccessor = frame.getLinkWidth;
    this.linkStyles = new Float32Array(frame.links.length * LINK_CACHED_STYLE_FLOATS);
    for (let index = 0; index < frame.links.length; index += 1) {
      this.writeLinkStyle(frame, index);
    }
  }

  private updateStyleCaches(frame: OwnedWebGpuFrame): boolean {
    if (this.styleCachesMatch(frame)) return false;
    this.updateNodeStyleCache(frame);
    this.updateLinkStyleCache(frame);
    return true;
  }

  canRender(): boolean {
    return this.pendingFrameCount < MAX_PENDING_FRAMES && !this.disposed;
  }

  private resizeCanvas(frame: OwnedWebGpuFrame): void {
    const maximum = this.device.limits.maxTextureDimension2D;
    const width = Math.min(
      Math.max(1, Math.round(frame.cssWidth * frame.devicePixelRatio)),
      maximum,
    );
    const height = Math.min(
      Math.max(1, Math.round(frame.cssHeight * frame.devicePixelRatio)),
      maximum,
    );
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  private uploadCamera(frame: OwnedWebGpuFrame): void {
    this.cameraValues[0] = frame.camera.centerX;
    this.cameraValues[1] = frame.camera.centerY;
    this.cameraValues[2] = frame.camera.zoom * 2 / frame.cssWidth;
    this.cameraValues[3] = frame.camera.zoom * 2 / frame.cssHeight;
    this.cameraValues[4] = 2 / frame.cssWidth;
    this.cameraValues[5] = 2 / frame.cssHeight;
    this.cameraValues[6] = graphDetailOpacity(frame.camera.zoom);
    this.cameraValues[7] = frame.hoveredLink
      ? this.renderedLinkIndexByLink.get(frame.hoveredLink) ?? -1
      : -1;
    this.cameraValues[8] = frame.hoveredNodeIndex;
    this.cameraValues[9] = frame.hoveredNodeScale;
    this.device.queue.writeBuffer(this.cameraBuffer, 0, this.cameraValues);
  }

  private edgeStride(frame: OwnedWebGpuFrame): number {
    return frame.links.length > 250_000
      && frame.camera.zoom < GRAPH_EDGE_HOVER_MIN_ZOOM ? 2 : 1;
  }

  private packNodePositions(frame: OwnedWebGpuFrame): void {
    const required = frame.nodes.length * NODE_POSITION_FLOATS;
    if (this.nodePositionValues.length !== required) {
      this.nodePositionValues = new Float32Array(required);
    }
    for (let index = 0; index < frame.nodes.length; index += 1) {
      const offset = index * NODE_POSITION_FLOATS;
      this.nodePositionValues[offset] = frame.nodeX[index] ?? 0;
      this.nodePositionValues[offset + 1] = frame.nodeY[index] ?? 0;
    }
  }

  private packLinkGeometry(
    frame: OwnedWebGpuFrame,
    sourceIndex: number,
    targetIndex: number,
    renderedIndex: number,
    curvature: number,
    writeArrows: boolean,
    nodeVisualScale: number,
  ): boolean {
    const sourceX = frame.nodeX[sourceIndex] ?? 0;
    const sourceY = frame.nodeY[sourceIndex] ?? 0;
    const targetX = frame.nodeX[targetIndex] ?? 0;
    const targetY = frame.nodeY[targetIndex] ?? 0;
    const offset = renderedIndex * LINK_GEOMETRY_FLOATS;
    this.linkGeometryValues[offset] = sourceX;
    this.linkGeometryValues[offset + 1] = sourceY;
    this.linkGeometryValues[offset + 2] = targetX;
    this.linkGeometryValues[offset + 3] = targetY;
    if (!writeArrows) return true;
    const sourceStyle = this.nodeStylesByIndex[sourceIndex];
    const targetStyle = this.nodeStylesByIndex[targetIndex];
    if (!sourceStyle || !targetStyle) return false;
    writeOwnedArrowCurveParameters(
      this.linkGeometryValues,
      offset + 4,
      sourceX,
      sourceY,
      targetX,
      targetY,
      curvature,
      sourceStyle,
      targetStyle,
      nodeVisualScale,
    );
    return true;
  }

  private packLinkStyle(
    link: GraphRendererLink,
    linkIndex: number,
    renderedIndex: number,
    curvature: number,
  ): void {
    const offset = renderedIndex * LINK_INSTANCE_STYLE_FLOATS;
    const cachedOffset = linkIndex * LINK_CACHED_STYLE_FLOATS;
    this.linkStyleValues[offset] = this.linkStyles[cachedOffset];
    this.linkStyleValues[offset + 1] = curvature;
    this.linkStyleValues.set(
      this.linkStyles.subarray(cachedOffset + 1, cachedOffset + LINK_CACHED_STYLE_FLOATS),
      offset + 2,
    );
    this.linkStyleValues[offset + 10] = link.bidirectional ? 1 : 0;
  }

  private packLinkInstance(
    frame: OwnedWebGpuFrame,
    linkIndex: number,
    renderedIndex: number,
    writeGeometry: boolean,
    writeStyle: boolean,
    writeArrows: boolean,
    nodeVisualScale: number,
  ): boolean {
    const link = frame.links[linkIndex];
    const sourceIndex = frame.edgeSources[linkIndex];
    const targetIndex = frame.edgeTargets[linkIndex];
    if (sourceIndex >= frame.nodes.length || targetIndex >= frame.nodes.length) return false;
    const curvature = link.curvature ?? 0;
    if (writeGeometry && !this.packLinkGeometry(
      frame,
      sourceIndex,
      targetIndex,
      renderedIndex,
      curvature,
      writeArrows,
      nodeVisualScale,
    )) return false;
    if (writeStyle) this.packLinkStyle(link, linkIndex, renderedIndex, curvature);
    return true;
  }

  private packLinkInstances(
    frame: OwnedWebGpuFrame,
    edgeStride: number,
    writeGeometry: boolean,
    writeStyle: boolean,
    writeArrows: boolean,
    nodeVisualScale: number,
  ): void {
    if (writeGeometry) {
      const required = frame.links.length * LINK_GEOMETRY_FLOATS;
      if (this.linkGeometryValues.length !== required) {
        this.linkGeometryValues = new Float32Array(required);
      }
    }
    if (writeStyle) {
      const required = frame.links.length * LINK_INSTANCE_STYLE_FLOATS;
      if (this.linkStyleValues.length !== required) {
        this.linkStyleValues = new Float32Array(required);
      }
    }
    this.renderedLinkCount = 0;
    this.renderedLinkIndexByLink = new WeakMap();
    for (let index = 0; index < frame.links.length; index += edgeStride) {
      if (!this.packLinkInstance(
        frame,
        index,
        this.renderedLinkCount,
        writeGeometry,
        writeStyle,
        writeArrows,
        nodeVisualScale,
      )) continue;
      this.renderedLinkIndexByLink.set(frame.links[index], this.renderedLinkCount);
      this.renderedLinkCount += 1;
    }
  }

  private uploadVertexStream(
    stream: VertexStream,
    values: Float32Array,
    byteLength: number,
  ): void {
    this.ensureVertexStream(stream, byteLength);
    if (byteLength > 0) {
      this.device.queue.writeBuffer(
        stream.buffer,
        0,
        values.buffer,
        values.byteOffset,
        byteLength,
      );
    }
  }

  private updateGraphCacheIdentity(
    frame: OwnedWebGpuFrame,
    edgeStride: number,
    arrowsVisible: boolean,
    nodeVisualScale: number,
  ): void {
    this.uploadedArrowsVisible = arrowsVisible;
    this.uploadedNodeVisualScale = nodeVisualScale;
    this.uploadedEdgeStride = edgeStride;
    this.uploadedPositionVersion = frame.positionVersion;
    this.uploadedNodes = frame.nodes;
    this.uploadedLinks = frame.links;
  }

  private positionsChanged(frame: OwnedWebGpuFrame): boolean {
    return this.uploadedNodes !== frame.nodes
      || this.uploadedLinks !== frame.links
      || this.uploadedPositionVersion !== frame.positionVersion;
  }

  private arrowGeometryChanged(arrowsVisible: boolean, nodeVisualScale: number): boolean {
    return arrowsVisible && (
      !this.uploadedArrowsVisible
      || this.uploadedNodeVisualScale !== nodeVisualScale
    );
  }

  private needsLinkGeometryUpdate(
    positionsChanged: boolean,
    stylesChanged: boolean,
    edgeStrideChanged: boolean,
    arrowGeometryChanged: boolean,
  ): boolean {
    return positionsChanged
      || stylesChanged
      || edgeStrideChanged
      || arrowGeometryChanged;
  }

  private updateGraphBuffers(frame: OwnedWebGpuFrame, stylesChanged: boolean): void {
    const edgeStride = this.edgeStride(frame);
    const positionsChanged = this.positionsChanged(frame);
    const edgeStrideChanged = this.uploadedEdgeStride !== edgeStride;
    const arrowsVisible = frame.directionMode === 'arrows'
      && graphDetailOpacity(frame.camera.zoom) > 0;
    const nodeVisualScale = ownedGraphNodeWorldScale(frame.camera.zoom);
    const linkGeometryChanged = this.needsLinkGeometryUpdate(
      positionsChanged,
      stylesChanged,
      edgeStrideChanged,
      this.arrowGeometryChanged(arrowsVisible, nodeVisualScale),
    );
    const linkStylesChanged = stylesChanged || edgeStrideChanged;

    if (positionsChanged) {
      this.packNodePositions(frame);
      this.uploadVertexStream(
        this.nodePositionStream,
        this.nodePositionValues,
        this.nodePositionValues.byteLength,
      );
    }
    if (stylesChanged) {
      this.uploadVertexStream(this.nodeStyleStream, this.nodeStyles, this.nodeStyles.byteLength);
    }
    if (linkGeometryChanged || linkStylesChanged) {
      this.packLinkInstances(
        frame,
        edgeStride,
        linkGeometryChanged,
        linkStylesChanged,
        arrowsVisible,
        nodeVisualScale,
      );
    }
    if (linkGeometryChanged) {
      this.uploadVertexStream(
        this.linkGeometryStream,
        this.linkGeometryValues,
        this.renderedLinkCount * LINK_GEOMETRY_FLOATS * FLOAT_BYTES,
      );
    }
    if (linkStylesChanged) {
      this.uploadVertexStream(
        this.linkStyleStream,
        this.linkStyleValues,
        this.renderedLinkCount * LINK_INSTANCE_STYLE_FLOATS * FLOAT_BYTES,
      );
    }
    this.updateGraphCacheIdentity(frame, edgeStride, arrowsVisible, nodeVisualScale);
  }

  private drawLinks(pass: GPURenderPassEncoder, frame: OwnedWebGpuFrame): void {
    if (this.renderedLinkCount === 0) return;
    pass.setPipeline(this.linkPipeline);
    pass.setBindGroup(0, this.linkCameraBindGroup);
    pass.setVertexBuffer(0, this.linkGeometryStream.buffer);
    pass.setVertexBuffer(1, this.linkStyleStream.buffer);
    pass.draw((OWNED_LINK_SEGMENTS + 1) * 2, this.renderedLinkCount);
    if (frame.directionMode !== 'arrows' || graphDetailOpacity(frame.camera.zoom) === 0) return;
    pass.setPipeline(this.arrowPipeline);
    pass.setBindGroup(0, this.arrowCameraBindGroup);
    pass.setVertexBuffer(0, this.linkGeometryStream.buffer);
    pass.setVertexBuffer(1, this.linkStyleStream.buffer);
    pass.draw(6, this.renderedLinkCount);
  }

  private drawNodes(pass: GPURenderPassEncoder, frame: OwnedWebGpuFrame): void {
    if (frame.nodes.length === 0) return;
    pass.setPipeline(this.nodePipeline);
    pass.setBindGroup(0, this.nodeCameraBindGroup);
    pass.setVertexBuffer(0, this.nodePositionStream.buffer);
    pass.setVertexBuffer(1, this.nodeStyleStream.buffer);
    pass.draw(6, frame.nodes.length);
  }

  private submitRenderPass(frame: OwnedWebGpuFrame): void {
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
    this.drawLinks(pass, frame);
    this.drawNodes(pass, frame);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private completeSubmittedFrame(): void {
    if (this.disposed) return;
    this.pendingFrameCount = Math.max(0, this.pendingFrameCount - 1);
    this.onFrameComplete();
  }

  private trackSubmittedFrame(): void {
    this.pendingFrameCount += 1;
    void this.device.queue.onSubmittedWorkDone()
      .then(() => this.completeSubmittedFrame())
      .catch(() => {
        // Device loss is reported by device.lost and handled by the surface.
      });
  }

  render(frame: OwnedWebGpuFrame): void {
    if (!this.canRender()) throw new Error('WebGPU frame submitted while the frame queue is full');
    const stylesChanged = this.updateStyleCaches(frame);
    this.resizeCanvas(frame);
    this.updateGraphBuffers(frame, stylesChanged);
    this.uploadCamera(frame);
    this.submitRenderPass(frame);
    this.trackSubmittedFrame();
  }

  dispose(): void {
    this.disposed = true;
    this.cameraBuffer.destroy();
    this.linkGeometryStream.buffer.destroy();
    this.linkStyleStream.buffer.destroy();
    this.nodePositionStream.buffer.destroy();
    this.nodeStyleStream.buffer.destroy();
    this.context.unconfigure();
    this.device.destroy();
  }
}

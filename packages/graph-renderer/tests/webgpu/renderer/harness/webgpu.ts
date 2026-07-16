import { vi } from 'vitest';
import type {
  GraphRendererLink,
  GraphRendererNode,
  WebGpuGraphFrame,
} from '@graph-renderer';

export function cleanUpWebGpuHarness(): void {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'gpu');
}

export function webGpuHarness() {
  const draw = vi.fn();
  const pass = {
    draw,
    end: vi.fn(),
    setBindGroup: vi.fn(),
    setPipeline: vi.fn(),
    setVertexBuffer: vi.fn(),
  };
  const encoder = { beginRenderPass: vi.fn(() => pass), finish: vi.fn(() => ({})) };
  const writeBuffer = vi.fn();
  const onSubmittedWorkDone = vi.fn(() => Promise.resolve());
  const pipeline = { getBindGroupLayout: vi.fn(() => ({})) };
  let resolveDeviceLost!: (info: GPUDeviceLostInfo) => void;
  const deviceLost = new Promise<GPUDeviceLostInfo>((resolve) => {
    resolveDeviceLost = resolve;
  });
  const device = {
    createBindGroup: vi.fn(() => ({})),
    createBuffer: vi.fn((descriptor: GPUBufferDescriptor) => ({
      destroy: vi.fn(),
      label: descriptor.label,
    })),
    createCommandEncoder: vi.fn(() => encoder),
    createRenderPipeline: vi.fn((_descriptor: GPURenderPipelineDescriptor) => pipeline),
    createShaderModule: vi.fn(() => ({})),
    destroy: vi.fn(),
    limits: { maxTextureDimension2D: 100 },
    lost: deviceLost,
    popErrorScope: vi.fn(async () => null),
    pushErrorScope: vi.fn(),
    queue: { onSubmittedWorkDone, submit: vi.fn(), writeBuffer },
  };
  const context = {
    configure: vi.fn(),
    getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
    unconfigure: vi.fn(),
  };
  const adapter = { requestDevice: vi.fn(async () => device) };
  const requestAdapter = vi.fn(async (): Promise<typeof adapter | null> => adapter);
  const gpu = {
    getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
    requestAdapter,
  };
  vi.stubGlobal('GPUBufferUsage', { COPY_DST: 1, UNIFORM: 2, VERTEX: 4 });
  Object.defineProperty(navigator, 'gpu', { configurable: true, value: gpu });
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getContext', { configurable: true, value: () => context });
  return {
    adapter,
    canvas,
    context,
    device,
    draw,
    gpu,
    pass,
    resolveDeviceLost,
    writeBuffer,
  };
}

export function rendererFrame(): WebGpuGraphFrame {
  const source = { id: 'a', x: 1, y: 2 } satisfies GraphRendererNode;
  const target = { id: 'b', x: 103, y: 4 } satisfies GraphRendererNode;
  const link = { bidirectional: true, curvature: 0.2, source, target } satisfies GraphRendererLink;
  return {
    backgroundColor: '#010203',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 200,
    cssWidth: 200,
    devicePixelRatio: 2,
    directionMode: 'arrows' as const,
    edgeSources: Uint32Array.of(0),
    edgeTargets: Uint32Array.of(1),
    getArrowColor: () => '#aabbcc',
    getLinkColor: () => '#112233',
    getLinkOpacity: () => 0.3,
    getLinkWidth: () => 2,
    getNodeStyle: (node: GraphRendererNode) => ({
      borderColor: '#445566',
      borderWidth: 2,
      cornerRadius: 3,
      fillColor: '#778899',
      fillOpacity: 0.5,
      height: node === target ? 10 : 12,
      opacity: 0.8,
      shape: 'rectangle' as const,
      width: node === target ? 40 : 10,
    }),
    hoveredNodeIndex: -1,
    hoveredNodeScale: 1,
    links: [link],
    nodes: [source, target],
    nodeX: Float32Array.of(1, 103),
    nodeY: Float32Array.of(2, 4),
    positionVersion: 1,
    styleVersion: 1,
  };
}

export function uploadedFloats(
  harness: ReturnType<typeof webGpuHarness>,
  label: string,
): Float32Array {
  const call = harness.writeBuffer.mock.calls.find(candidate => candidate[0].label === label)!;
  return new Float32Array(
    call[2] as ArrayBuffer,
    call[3] as number,
    (call[4] as number) / Float32Array.BYTES_PER_ELEMENT,
  );
}

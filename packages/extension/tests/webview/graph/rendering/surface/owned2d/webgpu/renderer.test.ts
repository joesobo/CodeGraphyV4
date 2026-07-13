import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import {
  OwnedWebGpuRenderer,
  parseWebGpuColor,
  webGpuNodeShapeCode,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer';

function expectColor(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((channel, index) => {
    expect(channel).toBeCloseTo(expected[index], 5);
  });
}

describe('owned WebGPU renderer color parsing', () => {
  it('parses short and full hexadecimal colors', () => {
    expectColor(parseWebGpuColor('#0af'), [0, 170 / 255, 1, 1]);
    expectColor(parseWebGpuColor('#33669980'), [51 / 255, 102 / 255, 153 / 255, 128 / 255]);
  });

  it('parses rgb and rgba colors', () => {
    expectColor(parseWebGpuColor('rgb(255, 128, 0)'), [1, 128 / 255, 0, 1]);
    expectColor(parseWebGpuColor('rgba(10, 20, 30, 0.25)'), [10 / 255, 20 / 255, 30 / 255, 0.25]);
  });

  it('parses modern color syntax produced by computed graph themes', () => {
    expectColor(
      parseWebGpuColor('color(srgb 0.0705882 0.203922 0.337255 / 0.95)'),
      [0.0705882, 0.203922, 0.337255, 0.95],
    );
  });

  it('keeps the transparent stage color transparent', () => {
    expect(parseWebGpuColor('transparent')).toEqual([0, 0, 0, 0]);
  });

  it('uses opaque black for unsupported CSS colors', () => {
    expect(parseWebGpuColor('not-a-color')).toEqual([0, 0, 0, 1]);
  });

  it('encodes every supported node shape for the GPU SDF shader', () => {
    expect([
      'circle',
      'square',
      'rectangle',
      'diamond',
      'triangle',
      'hexagon',
      'star',
    ].map(shape => webGpuNodeShapeCode(shape as Parameters<typeof webGpuNodeShapeCode>[0])))
      .toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'gpu');
});

function webGpuHarness() {
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
  const device = {
    createBindGroup: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({ destroy: vi.fn() })),
    createCommandEncoder: vi.fn(() => encoder),
    createRenderPipeline: vi.fn(() => pipeline),
    createShaderModule: vi.fn(() => ({})),
    destroy: vi.fn(),
    limits: { maxTextureDimension2D: 100 },
    lost: new Promise<GPUDeviceLostInfo>(() => undefined),
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
  Object.defineProperty(canvas, 'getContext', { value: () => context });
  return { adapter, canvas, draw, gpu, writeBuffer };
}

function rendererFrame() {
  const source = { id: 'a', x: 1, y: 2 } as FGNode;
  const target = { id: 'b', x: 3, y: 4 } as FGNode;
  const link = { bidirectional: true, curvature: 0.2, source, target } as FGLink;
  return {
    backgroundColor: '#010203',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 200,
    cssWidth: 200,
    devicePixelRatio: 2,
    directionMode: 'arrows' as const,
    getArrowColor: () => '#aabbcc',
    getLinkColor: () => '#112233',
    getLinkWidth: () => 2,
    getNodeStyle: (node: FGNode) => ({
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
    links: [link],
    nodes: [source, target],
    positionVersion: 1,
    styleVersion: 1,
  };
}

describe('OwnedWebGpuRenderer frame submission', () => {
  it('requests a software WebGPU adapter when no native adapter is available', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(harness.adapter);

    const renderer = await OwnedWebGpuRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });

    expect(renderer).toBeDefined();
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(1, {
      powerPreference: 'high-performance',
    });
    expect(harness.gpu.requestAdapter).toHaveBeenNthCalledWith(2, {
      forceFallbackAdapter: true,
    });
  });

  it('packs and caches graph instances while submitting links before nodes', async () => {
    const harness = webGpuHarness();
    const onFrameComplete = vi.fn();
    const renderer = await OwnedWebGpuRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete,
    });
    expect(renderer).toBeDefined();
    const frame = rendererFrame();

    renderer!.render(frame);

    expect([harness.canvas.width, harness.canvas.height]).toEqual([100, 100]);
    expect(harness.writeBuffer).toHaveBeenCalledTimes(3);
    const nodeValues = harness.writeBuffer.mock.calls[1][2] as Float32Array;
    expect(Array.from(nodeValues.slice(0, 4))).toEqual([1, 2, 5, 6]);
    const linkCall = harness.writeBuffer.mock.calls[2];
    const linkValues = new Float32Array(
      linkCall[2] as ArrayBuffer,
      linkCall[3] as number,
      (linkCall[4] as number) / Float32Array.BYTES_PER_ELEMENT,
    );
    expect(Array.from(linkValues.slice(0, 5))).toEqual([1, 2, 3, 4, 1]);
    expect(linkValues[5]).toBeCloseTo(0.2);
    expect(linkValues[14]).toBeCloseTo(6.47, 2);
    expect(linkValues[15]).toBeCloseTo(12.69, 2);
    expect(linkValues[16]).toBe(1);
    expect(harness.draw).toHaveBeenNthCalledWith(1, 30, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(2, 6, 2);

    renderer!.render(frame);
    expect(harness.writeBuffer).toHaveBeenCalledTimes(4);
    await Promise.resolve();
    expect(onFrameComplete).toHaveBeenCalledTimes(2);
  });
});

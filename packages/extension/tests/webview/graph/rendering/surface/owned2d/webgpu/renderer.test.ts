import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import {
  type OwnedWebGpuFrame,
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
    createBuffer: vi.fn((descriptor: GPUBufferDescriptor) => ({
      destroy: vi.fn(),
      label: descriptor.label,
    })),
    createCommandEncoder: vi.fn(() => encoder),
    createRenderPipeline: vi.fn((_descriptor: GPURenderPipelineDescriptor) => pipeline),
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
  return { adapter, canvas, device, draw, gpu, pass, writeBuffer };
}

function rendererFrame(): OwnedWebGpuFrame {
  const source = { id: 'a', x: 1, y: 2 } as FGNode;
  const target = { id: 'b', x: 103, y: 4 } as FGNode;
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
    const pipelineStrides = harness.device.createRenderPipeline.mock.calls.map(call =>
      Array.from(call[0].vertex.buffers ?? [], buffer => buffer?.arrayStride));
    expect(pipelineStrides).toEqual([[8, 52], [24, 44], [24, 44]]);
    expect(harness.device.createRenderPipeline.mock.calls.map(call => call[0].primitive?.topology))
      .toEqual(['triangle-list', 'triangle-strip', 'triangle-list']);
    expect(harness.writeBuffer.mock.calls.map(call => [
      call[0].label,
      call[4] ?? (call[2] as ArrayBufferView).byteLength,
    ])).toEqual([
      ['CodeGraphy camera uniform', 32],
      ['CodeGraphy node positions', 16],
      ['CodeGraphy node styles', 104],
      ['CodeGraphy link geometry', 24],
      ['CodeGraphy link styles', 44],
    ]);
    const uploadedFloats = (label: string): Float32Array => {
      const call = harness.writeBuffer.mock.calls.find(candidate => candidate[0].label === label)!;
      return new Float32Array(
        call[2] as ArrayBuffer,
        call[3] as number,
        (call[4] as number) / Float32Array.BYTES_PER_ELEMENT,
      );
    };
    expect(Array.from(uploadedFloats('CodeGraphy node positions'))).toEqual([1, 2, 103, 4]);
    expect(Array.from(uploadedFloats('CodeGraphy node styles').slice(0, 2))).toEqual([5, 6]);
    const linkGeometry = uploadedFloats('CodeGraphy link geometry');
    expect(Array.from(linkGeometry.slice(0, 4))).toEqual([1, 2, 103, 4]);
    expect(linkGeometry[4]).toBeGreaterThan(0);
    expect(linkGeometry[4]).toBeLessThan(0.5);
    expect(linkGeometry[5]).toBeGreaterThan(0.5);
    expect(linkGeometry[5]).toBeLessThan(1);
    const linkStyle = uploadedFloats('CodeGraphy link styles');
    expect(linkStyle[0]).toBe(1);
    expect(linkStyle[1]).toBeCloseTo(0.2);
    expect(linkStyle[10]).toBe(1);
    expect(harness.draw).toHaveBeenNthCalledWith(1, 34, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(2, 6, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(3, 6, 2);
    expect(harness.pass.setVertexBuffer.mock.calls.map(call => [call[0], call[1].label]))
      .toEqual([
        [0, 'CodeGraphy link geometry'],
        [1, 'CodeGraphy link styles'],
        [0, 'CodeGraphy link geometry'],
        [1, 'CodeGraphy link styles'],
        [0, 'CodeGraphy node positions'],
        [1, 'CodeGraphy node styles'],
      ]);

    harness.writeBuffer.mockClear();
    frame.nodes[0].x = 2;
    frame.positionVersion += 1;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => [
      call[0].label,
      call[4] ?? (call[2] as ArrayBufferView).byteLength,
    ])).toEqual([
      ['CodeGraphy camera uniform', 32],
      ['CodeGraphy node positions', 16],
      ['CodeGraphy link geometry', 24],
    ]);

    harness.writeBuffer.mockClear();
    frame.styleVersion += 1;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy camera uniform',
      'CodeGraphy node styles',
      'CodeGraphy link geometry',
      'CodeGraphy link styles',
    ]);
    await Promise.resolve();
    expect(onFrameComplete).toHaveBeenCalledTimes(3);
  });

  it('uploads sampled render positions for both nodes and edge endpoints', async () => {
    const harness = webGpuHarness();
    const renderer = await OwnedWebGpuRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.renderX = Float32Array.of(11, 113);
    frame.renderY = Float32Array.of(12, 14);

    renderer!.render(frame);

    const uploadedFloats = (label: string): Float32Array => {
      const call = harness.writeBuffer.mock.calls.find(candidate => candidate[0].label === label)!;
      return new Float32Array(
        call[2] as ArrayBuffer,
        call[3] as number,
        (call[4] as number) / Float32Array.BYTES_PER_ELEMENT,
      );
    };
    expect(Array.from(uploadedFloats('CodeGraphy node positions'))).toEqual([11, 12, 113, 14]);
    expect(Array.from(uploadedFloats('CodeGraphy link geometry').slice(0, 4)))
      .toEqual([11, 12, 113, 14]);
  });

  it('does not submit arrow vertices below the graph-detail zoom cutoff', async () => {
    const harness = webGpuHarness();
    const renderer = await OwnedWebGpuRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.camera.zoom = 0.35;

    renderer!.render(frame);

    expect(harness.draw).toHaveBeenNthCalledWith(1, 34, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(2, 6, 2);
    expect(harness.draw).toHaveBeenCalledTimes(2);
    const hiddenGeometryCall = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy link geometry',
    )!;
    const hiddenGeometry = new Float32Array(
      hiddenGeometryCall[2] as ArrayBuffer,
      hiddenGeometryCall[3] as number,
      (hiddenGeometryCall[4] as number) / Float32Array.BYTES_PER_ELEMENT,
    );
    expect(Array.from(hiddenGeometry.slice(4, 6))).toEqual([0, 0]);

    harness.draw.mockClear();
    harness.writeBuffer.mockClear();
    frame.camera.zoom = 0.95;
    renderer!.render(frame);

    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy camera uniform',
      'CodeGraphy link geometry',
    ]);
    const cameraValues = harness.writeBuffer.mock.calls[0][2] as Float32Array;
    expect(cameraValues[6]).toBeCloseTo(0.5);
    const visibleGeometryCall = harness.writeBuffer.mock.calls[1];
    const visibleGeometry = new Float32Array(
      visibleGeometryCall[2] as ArrayBuffer,
      visibleGeometryCall[3] as number,
      (visibleGeometryCall[4] as number) / Float32Array.BYTES_PER_ELEMENT,
    );
    expect(visibleGeometry[4]).toBeGreaterThan(0);
    expect(visibleGeometry[5]).toBeGreaterThan(0.5);
    expect(harness.draw).toHaveBeenNthCalledWith(1, 34, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(2, 6, 1);
    expect(harness.draw).toHaveBeenNthCalledWith(3, 6, 2);

    harness.writeBuffer.mockClear();
    frame.camera.zoom = 0.35;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .toEqual(['CodeGraphy camera uniform']);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphRendererLink, GraphRendererNode } from '@graph-renderer/contracts';
import {
  type WebGpuGraphFrame,
  WebGpuGraphRenderer,
  webGpuNodeShapeCode,
} from '@graph-renderer/webgpu/renderer';
import { LINK_SHADER, NODE_SHADER } from '@graph-renderer/webgpu/shaders';

describe('WebGPU renderer node shapes', () => {
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

function rendererFrame(): WebGpuGraphFrame {
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

describe('WebGpuGraphRenderer frame submission', () => {
  it('uses camera uniforms to emphasize hovered edge and node instances', () => {
    expect(LINK_SHADER).toContain('@builtin(instance_index) instanceIndex: u32');
    expect(LINK_SHADER).toContain('camera.highlightedLinkIndex');
    expect(NODE_SHADER).toContain('@builtin(instance_index) instanceIndex: u32');
    expect(NODE_SHADER).toContain('camera.hoveredNodeIndex');
    expect(NODE_SHADER).toContain('camera.hoveredNodeScale');
  });

  it('requests a software WebGPU adapter when no native adapter is available', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(harness.adapter);

    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
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

  it('reports WebGPU as unavailable when the browser has no GPU API', async () => {
    const harness = webGpuHarness();
    Reflect.deleteProperty(navigator, 'gpu');

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
  });

  it('reports WebGPU as unavailable when no adapter can be created', async () => {
    const harness = webGpuHarness();
    harness.gpu.requestAdapter.mockResolvedValue(null);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
    expect(harness.gpu.requestAdapter).toHaveBeenCalledTimes(2);
    expect(harness.adapter.requestDevice).not.toHaveBeenCalled();
  });

  it('destroys the device when the canvas has no WebGPU context', async () => {
    const harness = webGpuHarness();
    Object.defineProperty(harness.canvas, 'getContext', { value: () => null });

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).resolves.toBeUndefined();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up the context when pipeline validation fails', async () => {
    const harness = webGpuHarness();
    harness.device.popErrorScope.mockResolvedValue({ message: 'invalid pipeline' } as never);

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).rejects.toThrow('WebGPU pipeline validation failed: invalid pipeline');
    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it.each([
    ['unknown', 1],
    ['destroyed', 0],
  ] as const)('reports %s device loss appropriately', async (reason, expectedCalls) => {
    const harness = webGpuHarness();
    const onDeviceLost = vi.fn();
    await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost,
      onFrameComplete: vi.fn(),
    });

    harness.resolveDeviceLost({ message: 'device lost', reason } as GPUDeviceLostInfo);
    await Promise.resolve();

    expect(onDeviceLost).toHaveBeenCalledTimes(expectedCalls);
  });

  it('destroys the device when canvas context creation throws', async () => {
    const harness = webGpuHarness();
    Object.defineProperty(harness.canvas, 'getContext', {
      value: () => { throw new Error('context failed'); },
    });

    await expect(WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    })).rejects.toThrow('context failed');

    expect(harness.device.destroy).toHaveBeenCalledOnce();
  });

  it('disposes GPU resources only once', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });

    renderer!.dispose();
    renderer!.dispose();

    expect(harness.context.unconfigure).toHaveBeenCalledOnce();
    expect(harness.device.destroy).toHaveBeenCalledOnce();
    const buffers = harness.device.createBuffer.mock.results.map(result => result.value);
    for (const buffer of buffers) expect(buffer.destroy).toHaveBeenCalledOnce();
  });

  it('packs and caches graph instances while submitting links before nodes', async () => {
    const harness = webGpuHarness();
    const onFrameComplete = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
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
      ['CodeGraphy node positions', 16],
      ['CodeGraphy node styles', 104],
      ['CodeGraphy link geometry', 24],
      ['CodeGraphy link styles', 44],
      ['CodeGraphy camera uniform', 48],
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
    expect(Array.from(linkStyle.slice(2, 5))).toEqual([
      expect.closeTo(17 / 255, 5),
      expect.closeTo(34 / 255, 5),
      expect.closeTo(51 / 255, 5),
    ]);
    expect(linkStyle[5]).toBeCloseTo(0.3);
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
    frame.nodeX[0] = 2;
    frame.positionVersion += 1;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => [
      call[0].label,
      call[4] ?? (call[2] as ArrayBufferView).byteLength,
    ])).toEqual([
      ['CodeGraphy node positions', 16],
      ['CodeGraphy link geometry', 24],
      ['CodeGraphy camera uniform', 48],
    ]);

    harness.writeBuffer.mockClear();
    frame.styleVersion += 1;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy node styles',
      'CodeGraphy link geometry',
      'CodeGraphy link styles',
      'CodeGraphy camera uniform',
    ]);
    await Promise.resolve();
    expect(onFrameComplete).toHaveBeenCalledTimes(3);
  });

  it('packs node instances by ascending drawn size without reordering graph data', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    const originalNodes = [...frame.nodes];
    frame.getNodeStyle = node => ({
      borderColor: '#445566',
      borderWidth: 1,
      cornerRadius: 0,
      fillColor: '#778899',
      fillOpacity: 1,
      height: node === frame.nodes[0] ? 60 : 10,
      opacity: 1,
      shape: 'circle',
      width: node === frame.nodes[0] ? 60 : 10,
    });

    renderer!.render(frame);

    const positionWrite = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy node positions',
    )!;
    const positions = new Float32Array(
      positionWrite[2] as ArrayBuffer,
      positionWrite[3] as number,
      (positionWrite[4] as number) / Float32Array.BYTES_PER_ELEMENT,
    );
    expect(Array.from(positions)).toEqual([103, 4, 1, 2]);
    expect(frame.nodes).toEqual(originalNodes);
    expect(Array.from(frame.nodeX)).toEqual([1, 103]);
  });

  it('keeps cached size order for position-only frames', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    const getNodeStyle = vi.fn(frame.getNodeStyle);
    frame.getNodeStyle = getNodeStyle;
    renderer!.render(frame);
    await Promise.resolve();
    harness.writeBuffer.mockClear();
    frame.nodeX[0] = 7;
    frame.positionVersion += 1;

    renderer!.render(frame);

    expect(getNodeStyle).toHaveBeenCalledTimes(2);
    const positionWrite = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy node positions',
    )!;
    const positions = new Float32Array(
      positionWrite[2] as ArrayBuffer,
      positionWrite[3] as number,
      (positionWrite[4] as number) / Float32Array.BYTES_PER_ELEMENT,
    );
    expect(Array.from(positions)).toEqual([7, 2, 103, 4]);
  });

  it('highlights a hovered node with camera-only GPU updates', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.hoveredNodeIndex = 1;
    frame.hoveredNodeScale = 1.08;
    renderer!.render(frame);

    const cameraWrite = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy camera uniform',
    )!;
    const cameraValues = cameraWrite[2] as Float32Array;
    expect(cameraValues[8]).toBe(1);
    expect(cameraValues[9]).toBeCloseTo(1.08);
    expect(harness.draw.mock.calls.slice(-2)).toEqual([
      [6, 1, 0, 0],
      [6, 1, 0, 1],
    ]);

    harness.writeBuffer.mockClear();
    frame.hoveredNodeScale = 1.1;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .toEqual(['CodeGraphy camera uniform']);
  });

  it('highlights a hovered edge with camera-only GPU updates', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.hoveredLink = frame.links[0];
    renderer!.render(frame);

    const initialCameraWrite = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy camera uniform',
    )!;
    expect((initialCameraWrite[2] as Float32Array)[7]).toBe(0);

    harness.writeBuffer.mockClear();
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .toEqual(['CodeGraphy camera uniform']);

    harness.writeBuffer.mockClear();
    frame.hoveredLink = null;
    renderer!.render(frame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .toEqual(['CodeGraphy camera uniform']);
    expect((harness.writeBuffer.mock.calls[0][2] as Float32Array)[7]).toBe(-1);
  });

  it('keeps link picking indexes cached across position-only frames', async () => {
    const NativeWeakMap = globalThis.WeakMap;
    let createdWeakMaps = 0;
    class CountingWeakMap extends NativeWeakMap<object, unknown> {
      constructor() {
        super();
        createdWeakMaps += 1;
      }
    }
    vi.stubGlobal('WeakMap', CountingWeakMap);
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.hoveredLink = frame.links[0];
    renderer!.render(frame);
    const afterInitialPacking = createdWeakMaps;
    frame.nodeX[0] = 8;
    frame.positionVersion += 1;

    renderer!.render(frame);

    expect(createdWeakMaps).toBe(afterInitialPacking);
    const cameraWrite = harness.writeBuffer.mock.calls
      .filter(call => call[0].label === 'CodeGraphy camera uniform')
      .at(-1)!;
    expect((cameraWrite[2] as Float32Array)[7]).toBe(0);
  });

  it('uploads authoritative positions for both nodes and edge endpoints', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
    });
    const frame = rendererFrame();
    frame.nodeX[0] = 11;
    frame.nodeY[0] = 12;
    frame.nodeX[1] = 113;
    frame.nodeY[1] = 14;

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
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
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
      'CodeGraphy link geometry',
      'CodeGraphy camera uniform',
    ]);
    const cameraValues = harness.writeBuffer.mock.calls[1][2] as Float32Array;
    expect(cameraValues[6]).toBeCloseTo(0.5);
    const visibleGeometryCall = harness.writeBuffer.mock.calls[0];
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

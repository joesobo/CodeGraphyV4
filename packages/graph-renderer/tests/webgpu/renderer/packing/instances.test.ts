import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGpuGraphRenderer } from '@graph-renderer';
import {
  cleanUpWebGpuHarness,
  rendererFrame,
  uploadedFloats,
  webGpuHarness,
} from '../harness/webgpu';

afterEach(cleanUpWebGpuHarness);

describe('WebGPU renderer frame packing', () => {
  it('cleans up a secondary context when surface setup fails', async () => {
    const harness = webGpuHarness();
    const secondaryContext = {
      configure: vi.fn(() => { throw new Error('secondary configure failed'); }),
      unconfigure: vi.fn(),
    };
    const secondaryCanvas = document.createElement('canvas');
    Object.defineProperty(secondaryCanvas, 'getContext', {
      configurable: true,
      value: () => secondaryContext,
    });
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });

    expect(() => renderer!.setSecondarySurface(secondaryCanvas))
      .toThrow('secondary configure failed');
    expect(secondaryContext.unconfigure).toHaveBeenCalledOnce();
    expect(renderer!.render(rendererFrame())).toBe(1);
  });

  it('renders a registered secondary surface from shared graph buffers in one submission', async () => {
    const harness = webGpuHarness();
    const secondaryContext = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
      unconfigure: vi.fn(),
    };
    const secondaryCanvas = document.createElement('canvas');
    Object.defineProperty(secondaryCanvas, 'getContext', {
      configurable: true,
      value: () => secondaryContext,
    });
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });
    const frame = rendererFrame();
    const getBaseNodeStyle = vi.fn(() => ({
      borderColor: '#000000', borderWidth: 0, cornerRadius: 0,
      fillColor: '#010203', fillOpacity: 1, height: 12, opacity: 1,
      shape: 'circle' as const, width: 12,
    }));
    const secondaryFrame = {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      camera: { centerX: 50, centerY: 3, zoom: 1.5 },
      cssHeight: 160,
      cssWidth: 160,
      devicePixelRatio: 2,
      getLinkColor: () => '#abcdef',
      getLinkOpacity: () => 0.3,
      getLinkWidth: () => 1,
      getNodeStyle: getBaseNodeStyle,
      styleVersion: 1,
    };

    renderer!.setSecondarySurface(secondaryCanvas);
    renderer!.render(frame, secondaryFrame);

    expect(secondaryContext.configure).toHaveBeenCalledWith(expect.objectContaining({
      device: harness.device,
    }));
    expect(harness.device.createCommandEncoder).toHaveBeenCalledTimes(1);
    expect(harness.device.queue.submit).toHaveBeenCalledTimes(1);
    expect(harness.device.createCommandEncoder.mock.results[0]?.value.beginRenderPass)
      .toHaveBeenCalledTimes(2);
    expect(harness.draw.mock.calls).toEqual([
      [34, 1],
      [6, 1],
      [6, 2],
      [34, 1],
      [6, 2],
    ]);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy node positions',
      'CodeGraphy node styles',
      'CodeGraphy link geometry',
      'CodeGraphy link styles',
      'CodeGraphy camera uniform',
      'CodeGraphy secondary camera uniform',
      'CodeGraphy secondary node styles',
      'CodeGraphy secondary link styles',
    ]);
    expect(getBaseNodeStyle).toHaveBeenCalledTimes(2);
    expect(renderer!.lastSecondaryRefreshCpuMs()).toEqual(expect.any(Number));
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy secondary node styles').slice(2, 5)))
      .toEqual([
        expect.closeTo(1 / 255, 5),
        expect.closeTo(2 / 255, 5),
        expect.closeTo(3 / 255, 5),
      ]);
    expect([secondaryCanvas.width, secondaryCanvas.height]).toEqual([100, 100]);

    harness.writeBuffer.mockClear();
    frame.nodeX[0] += 1;
    frame.positionVersion += 1;
    renderer!.render(frame, secondaryFrame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .not.toContain('CodeGraphy secondary node styles');
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label))
      .not.toContain('CodeGraphy secondary link styles');

    harness.writeBuffer.mockClear();
    secondaryFrame.styleVersion += 1;
    renderer!.render(frame, secondaryFrame);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy camera uniform',
      'CodeGraphy secondary camera uniform',
      'CodeGraphy secondary node styles',
      'CodeGraphy secondary link styles',
    ]);

    renderer!.setSecondarySurface(undefined);
    expect(secondaryContext.unconfigure).toHaveBeenCalledTimes(1);
  });

  it('repacks secondary links after an intervening primary-only stride change', async () => {
    const harness = webGpuHarness();
    const secondaryCanvas = document.createElement('canvas');
    Object.defineProperty(secondaryCanvas, 'getContext', {
      configurable: true,
      value: () => harness.context,
    });
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(), onFrameComplete: vi.fn(), onRendererError: vi.fn(),
    });
    const frame = rendererFrame();
    const edgeCount = 250_001;
    frame.links = Array.from({ length: edgeCount }, () => frame.links[0]);
    frame.edgeSources = new Uint32Array(edgeCount);
    frame.edgeTargets = new Uint32Array(edgeCount).fill(1);
    const secondaryFrame = {
      backgroundColor: '#000000',
      camera: { centerX: 0, centerY: 0, zoom: 1 },
      cssHeight: 160,
      cssWidth: 160,
      devicePixelRatio: 1,
      getLinkColor: () => '#112233',
      getLinkOpacity: () => 1,
      getLinkWidth: () => 1,
      getNodeStyle: frame.getNodeStyle,
      styleVersion: 1,
    };
    renderer!.setSecondarySurface(secondaryCanvas);
    renderer!.render(frame, secondaryFrame);
    await Promise.resolve();
    await Promise.resolve();

    frame.camera.zoom = 0.1;
    renderer!.render(frame);
    await Promise.resolve();
    await Promise.resolve();
    harness.writeBuffer.mockClear();

    renderer!.render(frame, secondaryFrame);

    const secondaryLinkUpload = harness.writeBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy secondary link styles',
    );
    expect(secondaryLinkUpload?.[4]).toBe(Math.ceil(edgeCount / 2) * 11 * 4);
  }, 10_000);

  it('reports no secondary refresh cost for a primary-only frame', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(), onFrameComplete: vi.fn(), onRendererError: vi.fn(),
    });

    renderer!.render(rendererFrame());

    expect(renderer!.lastSecondaryRefreshCpuMs()).toBeUndefined();
  });

  it('includes command finalization and submission in secondary refresh CPU time', async () => {
    const harness = webGpuHarness();
    const events: string[] = [];
    vi.spyOn(performance, 'now').mockImplementation(() => {
      events.push('time');
      return events.length === 1 ? 10 : 15;
    });
    harness.device.queue.submit.mockImplementation(() => {
      events.push('submit');
    });
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(), onFrameComplete: vi.fn(), onRendererError: vi.fn(),
    });
    const secondaryCanvas = document.createElement('canvas');
    Object.defineProperty(secondaryCanvas, 'getContext', {
      configurable: true,
      value: () => harness.context,
    });
    renderer!.setSecondarySurface(secondaryCanvas);

    renderer!.render(rendererFrame(), {
      backgroundColor: '#000000',
      camera: { centerX: 0, centerY: 0, zoom: 1 },
      cssHeight: 160,
      cssWidth: 160,
      devicePixelRatio: 1,
      getLinkColor: () => '#112233',
      getLinkOpacity: () => 1,
      getLinkWidth: () => 1,
      getNodeStyle: rendererFrame().getNodeStyle,
      styleVersion: 1,
    });

    expect(events).toEqual(['time', 'submit', 'time']);
    expect(renderer!.lastSecondaryRefreshCpuMs()).toBe(5);
  });

  it('packs and caches graph instances while submitting links before nodes', async () => {
    const harness = webGpuHarness();
    const onFrameComplete = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete,
      onRendererError: vi.fn(),
    });
    expect(renderer).toBeDefined();
    const frame = rendererFrame();

    expect(renderer!.render(frame)).toBe(1);

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
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy node positions')))
      .toEqual([1, 2, 103, 4]);
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy node styles').slice(0, 2)))
      .toEqual([5, 6]);
    const linkGeometry = uploadedFloats(harness, 'CodeGraphy link geometry');
    expect(Array.from(linkGeometry.slice(0, 4))).toEqual([1, 2, 103, 4]);
    expect(linkGeometry[4]).toBeGreaterThan(0);
    expect(linkGeometry[4]).toBeLessThan(0.5);
    expect(linkGeometry[5]).toBeGreaterThan(0.5);
    expect(linkGeometry[5]).toBeLessThan(1);
    const linkStyle = uploadedFloats(harness, 'CodeGraphy link styles');
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
    expect(renderer!.render(frame)).toBe(2);
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
    expect(renderer!.render(frame)).toBe(3);
    expect(harness.writeBuffer.mock.calls.map(call => call[0].label)).toEqual([
      'CodeGraphy node styles',
      'CodeGraphy link geometry',
      'CodeGraphy link styles',
      'CodeGraphy camera uniform',
    ]);
    await vi.waitFor(() => {
      expect(onFrameComplete.mock.calls).toEqual([[1], [2], [3]]);
    });
  });

  it('packs node instances by ascending drawn size without reordering graph data', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
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

    expect(Array.from(uploadedFloats(harness, 'CodeGraphy node positions')))
      .toEqual([103, 4, 1, 2]);
    expect(frame.nodes).toEqual(originalNodes);
    expect(Array.from(frame.nodeX)).toEqual([1, 103]);
  });

  it('keeps cached size order for position-only frames', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
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
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy node positions')))
      .toEqual([7, 2, 103, 4]);
  });

  it('uploads authoritative positions for both nodes and edge endpoints', async () => {
    const harness = webGpuHarness();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete: vi.fn(),
      onRendererError: vi.fn(),
    });
    const frame = rendererFrame();
    frame.nodeX[0] = 11;
    frame.nodeY[0] = 12;
    frame.nodeX[1] = 113;
    frame.nodeY[1] = 14;

    renderer!.render(frame);

    expect(Array.from(uploadedFloats(harness, 'CodeGraphy node positions')))
      .toEqual([11, 12, 113, 14]);
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy link geometry').slice(0, 4)))
      .toEqual([11, 12, 113, 14]);
  });
});

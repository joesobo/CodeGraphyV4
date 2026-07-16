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
  it('packs and caches graph instances while submitting links before nodes', async () => {
    const harness = webGpuHarness();
    const onFrameComplete = vi.fn();
    const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
      onDeviceLost: vi.fn(),
      onFrameComplete,
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
    await Promise.resolve();
    expect(onFrameComplete.mock.calls).toEqual([[1], [2], [3]]);
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

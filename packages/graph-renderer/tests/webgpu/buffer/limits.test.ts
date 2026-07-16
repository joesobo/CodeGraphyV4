import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphRendererNode, WebGpuGraphFrame } from '@graph-renderer';
import { WebGpuGraphRenderer } from '@graph-renderer';
import {
  cleanUpWebGpuHarness,
  rendererFrame,
  webGpuHarness,
} from '../renderer/harness/webgpu';

afterEach(cleanUpWebGpuHarness);

function frameWithNodeCount(count: number): WebGpuGraphFrame {
  const nodes = Array.from(
    { length: count },
    (_, index): GraphRendererNode => ({ id: `node-${index}`, x: index, y: index }),
  );
  return {
    ...rendererFrame(),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    links: [],
    nodes,
    nodeX: Float32Array.from(nodes, node => node.x!),
    nodeY: Float32Array.from(nodes, node => node.y!),
  };
}

async function rendererWithBufferLimit(maxBufferSize: number) {
  const harness = webGpuHarness();
  harness.device.limits.maxBufferSize = maxBufferSize;
  const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
    onDeviceLost: vi.fn(),
    onFrameComplete: vi.fn(),
    onRendererError: vi.fn(),
  });
  return { harness, renderer: renderer! };
}

describe('WebGPU frame buffer limits', () => {
  it('rejects oversized node styles before mutating renderer state', async () => {
    const { harness, renderer } = await rendererWithBufferLimit(256);
    const frame = frameWithNodeCount(6);

    expect(() => renderer.render(frame)).toThrow(
      'WebGPU node styles require 312 bytes; device maxBufferSize is 256 bytes',
    );
    expect(harness.device.createCommandEncoder).not.toHaveBeenCalled();
    expect(harness.writeBuffer).not.toHaveBeenCalled();

    harness.device.limits.maxBufferSize = 1_024;
    expect(renderer.render(frame)).toBe(1);
    expect(harness.writeBuffer.mock.calls.some(call => (
      call[0].label === 'CodeGraphy node styles'
    ))).toBe(true);
  });

  it('rejects oversized link instance styles', async () => {
    const { renderer } = await rendererWithBufferLimit(256);
    const frame = rendererFrame();
    const link = frame.links[0];
    frame.links = Array.from({ length: 6 }, () => link);
    frame.edgeSources = new Uint32Array(6);
    frame.edgeTargets = new Uint32Array(6).fill(1);

    expect(() => renderer.render(frame)).toThrow(
      'WebGPU link styles require 264 bytes; device maxBufferSize is 256 bytes',
    );
  });

  it('uses an exact valid capacity when geometric growth would exceed the limit', async () => {
    const { harness, renderer } = await rendererWithBufferLimit(400);

    expect(renderer.render(frameWithNodeCount(7))).toBe(1);

    const nodeStyleAllocation = harness.device.createBuffer.mock.calls.find(
      call => call[0].label === 'CodeGraphy node styles' && call[0].size !== 256,
    );
    expect(nodeStyleAllocation?.[0].size).toBe(364);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGpuGraphRenderer } from '@graph-renderer';
import {
  cleanUpWebGpuHarness,
  rendererFrame,
  uploadedFloats,
  webGpuHarness,
} from '../harness/webgpu';

afterEach(cleanUpWebGpuHarness);

describe('WebGPU renderer detail visibility', () => {
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
    expect(Array.from(uploadedFloats(harness, 'CodeGraphy link geometry').slice(4, 6)))
      .toEqual([0, 0]);

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
    const visibleGeometry = uploadedFloats(harness, 'CodeGraphy link geometry');
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

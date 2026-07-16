import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGpuGraphRenderer } from '@graph-renderer';
import { cleanUpWebGpuHarness, rendererFrame, webGpuHarness } from '../harness/webgpu';

afterEach(cleanUpWebGpuHarness);

describe('WebGPU renderer interaction uniforms', () => {
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
});

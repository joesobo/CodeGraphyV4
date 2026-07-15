import { describe, expect, it } from 'vitest';

import {
  GRAPH_BENCHMARK_DEVICE_SCALE_FACTOR,
  GRAPH_BENCHMARK_VIEWPORT,
  graphBenchmarkChromiumArguments,
} from '../../src/harness/chromium';

describe('graphBenchmarkChromiumArguments', () => {
  it('shares a fixed benchmark viewport and device scale', () => {
    expect(GRAPH_BENCHMARK_VIEWPORT).toEqual({ height: 720, width: 1280 });
    expect(GRAPH_BENCHMARK_DEVICE_SCALE_FACTOR).toBe(1);
    expect(Object.isFrozen(GRAPH_BENCHMARK_VIEWPORT)).toBe(true);
  });

  it('enables WebGPU and selects Metal only on macOS', () => {
    expect(graphBenchmarkChromiumArguments('darwin')).toEqual([
      '--enable-unsafe-webgpu',
      '--use-angle=metal',
    ]);
    expect(graphBenchmarkChromiumArguments('linux')).toEqual([
      '--enable-unsafe-webgpu',
    ]);
    expect(graphBenchmarkChromiumArguments('win32')).toEqual([
      '--enable-unsafe-webgpu',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { graphBenchmarkChromiumArguments } from '../../src/harness/chromium';

describe('graphBenchmarkChromiumArguments', () => {
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

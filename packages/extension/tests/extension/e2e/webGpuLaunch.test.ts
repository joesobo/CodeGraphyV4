import { describe, expect, it } from 'vitest';

import { webGpuCiLaunchArgs } from '../../../src/e2e/webGpuLaunch';

describe('webGpuCiLaunchArgs', () => {
  it('enables the bundled software WebGPU adapter on Linux CI', () => {
    expect(webGpuCiLaunchArgs({ ci: true, platform: 'linux' })).toEqual([
      '--enable-unsafe-webgpu',
      '--enable-unsafe-swiftshader',
      '--enable-features=Vulkan',
      '--use-angle=swiftshader',
      '--use-vulkan=swiftshader',
    ]);
  });

  it('does not override the native adapter outside Linux CI', () => {
    expect(webGpuCiLaunchArgs({ ci: false, platform: 'linux' })).toEqual([]);
    expect(webGpuCiLaunchArgs({ ci: true, platform: 'darwin' })).toEqual([]);
  });
});

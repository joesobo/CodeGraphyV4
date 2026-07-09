import { describe, expect, it } from 'vitest';

import { createPerfRunnerMetadata } from './metadata';

describe('performance runner metadata', () => {
  it('captures stable runner-class identity fields', () => {
    expect(createPerfRunnerMetadata({
      arch: () => 'arm64',
      cpuModels: () => ['Apple M4', 'Apple M4'],
      nodeVersion: 'v22.22.0',
      os: () => 'darwin',
      runnerClass: 'local-reference',
      vscodeVersion: '1.128.0',
    })).toEqual({
      arch: 'arm64',
      cpuModel: 'Apple M4',
      nodeVersion: 'v22.22.0',
      os: 'darwin',
      runnerClass: 'local-reference',
      vscodeVersion: '1.128.0',
    });
  });

  it('rejects missing CPU identity', () => {
    expect(() => createPerfRunnerMetadata({
      arch: () => 'x64',
      cpuModels: () => [],
      nodeVersion: 'v22.22.0',
      os: () => 'linux',
      runnerClass: 'linux-x64',
      vscodeVersion: '1.128.0',
    })).toThrow('CPU model');
  });
});

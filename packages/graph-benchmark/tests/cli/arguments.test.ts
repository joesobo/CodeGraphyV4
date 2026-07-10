import { describe, expect, it } from 'vitest';

import { parseBenchmarkArguments } from '../../src/cli/arguments';

describe('parseBenchmarkArguments', () => {
  it('parses the documented graph benchmark command options', () => {
    expect(parseBenchmarkArguments([
      '--fixture',
      '10k',
      '--renderer',
      'current',
      '--seed',
      '42',
      '--output',
      'reports/ten-thousand.json',
      '--timeout-ms',
      '90000',
    ])).toEqual({
      fixture: '10k',
      renderer: 'current',
      seed: 42,
      outputPath: 'reports/ten-thousand.json',
      timeoutMs: 90_000,
    });
  });
});

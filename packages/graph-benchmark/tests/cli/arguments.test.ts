import { describe, expect, it } from 'vitest';

import { parseBenchmarkArguments } from '../../src/cli/arguments';

describe('parseBenchmarkArguments', () => {
  it('parses the documented graph benchmark command options', () => {
    expect(parseBenchmarkArguments([
      '--fixture',
      '2.5k',
      '--renderer',
      'current',
      '--seed',
      '42',
      '--runs',
      '5',
      '--memory-cycles',
      '6',
      '--idle-ms',
      '6000',
      '--baseline',
      'reports/baseline.json',
      '--output',
      'reports/two-and-a-half-thousand.json',
      '--timeout-ms',
      '90000',
    ])).toEqual({
      fixture: '2.5k',
      renderer: 'current',
      seed: 42,
      runs: 5,
      memoryCycles: 6,
      idleMs: 6_000,
      baselinePath: 'reports/baseline.json',
      outputPath: 'reports/two-and-a-half-thousand.json',
      timeoutMs: 90_000,
    });
  });

  it('defaults to three independent runs and five open-close cycles', () => {
    expect(parseBenchmarkArguments([
      '--fixture', '500',
      '--renderer', 'current',
    ])).toMatchObject({
      runs: 3,
      memoryCycles: 5,
      baselinePath: undefined,
    });
  });

  it('allows interaction-only runs to skip legacy memory-close cycles', () => {
    expect(parseBenchmarkArguments([
      '--fixture', '500',
      '--renderer', 'current',
      '--memory-cycles', '0',
    ])).toMatchObject({ memoryCycles: 0 });
  });

  it('rejects fewer than three runs because reported metrics are averages', () => {
    expect(() => parseBenchmarkArguments([
      '--fixture', '500',
      '--renderer', 'current',
      '--runs', '2',
    ])).toThrow('--runs must be an integer greater than or equal to 3');
  });
});

import { describe, expect, it } from 'vitest';

import { parseBenchmarkArguments } from '../../src/cli/arguments';

describe('parseBenchmarkArguments', () => {
  it('parses the documented graph benchmark command options', () => {
    expect(parseBenchmarkArguments([
      '--attribution',
      'true',
      '--fixture',
      '2.5k',
      '--headless',
      'false',
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
      attribution: true,
      fixture: '2.5k',
      headless: false,
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
      attribution: false,
      headless: true,
      memoryCycles: 5,
      seed: 307,
      baselinePath: undefined,
    });
  });

  it('rejects missing option values', () => {
    expect(() => parseBenchmarkArguments([
      '--fixture', '500',
      '--renderer', 'current',
      '--seed', '--runs', '3',
    ])).toThrow('--seed requires a value');
  });

  it.each(['-1', '1.5', '9007199254740992'])(
    'rejects invalid synthetic seed %s',
    (seed) => {
      expect(() => parseBenchmarkArguments([
        '--fixture', '500',
        '--renderer', 'current',
        '--seed', seed,
      ])).toThrow('--seed must be an integer greater than or equal to 0');
    },
  );

  it('rejects invalid headed-mode values', () => {
    expect(() => parseBenchmarkArguments([
      '--fixture', '500',
      '--renderer', 'current',
      '--headless', 'sometimes',
    ])).toThrow('--headless must be true or false');
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

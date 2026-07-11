import { describe, expect, it } from 'vitest';

import {
  assessMemoryPlateau,
  parseProcessSnapshot,
  summarizeIdleProcessUsage,
} from '../../src/metrics/process';

const mib = (value: number): number => value * 1024 ** 2;

describe('parseProcessSnapshot', () => {
  it('parses macOS ps CPU time with fractional seconds', () => {
    const snapshot = parseProcessSnapshot([
      '100 1 00:01.50 1024',
      '101 100 01:02:03.25 2048',
    ].join('\n'));

    expect(snapshot.get(100)).toEqual({
      pid: 100,
      parentPid: 1,
      cpuTimeMs: 1_500,
      residentBytes: 1_048_576,
    });
    expect(snapshot.get(101)?.cpuTimeMs).toBe(3_723_250);
  });
});

describe('summarizeIdleProcessUsage', () => {
  it('measures CPU deltas and final RSS for the browser process tree', () => {
    const before = parseProcessSnapshot([
      '100 1 00:01.00 1024',
      '101 100 00:00.50 512',
      '999 1 00:20.00 9000',
    ].join('\n'));
    const after = parseProcessSnapshot([
      '100 1 00:01.50 1536',
      '101 100 00:00.75 768',
      '999 1 00:21.00 9000',
    ].join('\n'));

    expect(summarizeIdleProcessUsage(before, after, 100, 2_000)).toEqual({
      cpuPct: 37.5,
      residentBytes: 2_359_296,
      processCount: 2,
    });
  });
});

describe('assessMemoryPlateau', () => {
  it('accepts a noisy but flat aggregate sequence after warmup', () => {
    const result = assessMemoryPlateau([
      mib(180), mib(170), mib(166), mib(166.4), mib(165.8),
      mib(166.1), mib(165.9), mib(166.2), mib(166), mib(165.8),
      mib(166.1), mib(166), mib(165.9), mib(166.1), mib(166),
    ]);

    expect(result).toMatchObject({ plateau: true, sampleCount: 15 });
  });

  it('rejects sustained 100 to 114 MiB growth across the aggregate sequence', () => {
    const samples = Array.from({ length: 15 }, (_, index) => mib(100 + index));
    expect(assessMemoryPlateau(samples)).toMatchObject({
      growthBytes: mib(9),
      plateau: false,
      sampleCount: 15,
    });
  });

  it('rejects a late retained-memory spike even when endpoints look flat', () => {
    expect(assessMemoryPlateau([
      mib(180), mib(170), mib(166), mib(166), mib(166),
      mib(166), mib(166), mib(166), mib(220), mib(166),
      mib(166), mib(166), mib(166), mib(166), mib(166),
    ])).toMatchObject({ plateau: false });
  });

  it('requires the full three-run default cycle sequence', () => {
    expect(() => assessMemoryPlateau(Array.from({ length: 14 }, () => mib(166))))
      .toThrow('at least 15 cycles');
  });
});

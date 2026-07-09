import { describe, expect, it, vi } from 'vitest';
import {
  parsePerfCliArguments,
  runPerf,
  type PerfCliOptions,
} from './run';
import type {
  LaunchPerfSessionOptions,
  PerfSmokeResult,
} from './runner/launch';

describe('performance CLI', () => {
  it('defaults to one small smoke run', () => {
    expect(parsePerfCliArguments([])).toEqual({
      fixture: 'small',
      noBudget: false,
      runs: 1,
      smoke: true,
      symbols: false,
    });
  });

  it('parses fixture run and symbol options', () => {
    expect(parsePerfCliArguments([
      '--',
      '--smoke',
      '--fixture',
      'giant',
      '--runs',
      '3',
      '--symbols',
      '--no-budget',
    ])).toEqual({
      fixture: 'giant',
      noBudget: true,
      runs: 3,
      smoke: true,
      symbols: true,
    });
  });

  it('rejects an unknown fixture', () => {
    expect(() => parsePerfCliArguments(['--fixture', 'enormous'])).toThrow(
      'Unknown performance fixture',
    );
  });

  it('launches each requested run sequentially', async () => {
    const launchSession = vi.fn(async (
      options: LaunchPerfSessionOptions,
    ): Promise<PerfSmokeResult> => ({
      schemaVersion: 1 as const,
      fixture: options.fixture,
      runId: options.runId,
      scenario: 'cold-open' as const,
      metrics: [{ metric: 'coldOpenMs' as const, unit: 'ms' as const, value: 20 }],
    }));
    const options: PerfCliOptions = {
      fixture: 'medium',
      noBudget: true,
      runs: 2,
      smoke: true,
      symbols: false,
    };

    const results = await runPerf(options, {
      launchSession,
      repoRoot: '/repo',
      vscodeVersion: '1.128.0',
    });

    expect(results).toHaveLength(2);
    expect(launchSession.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ runId: 'medium-1', resultPath: '/repo/perf/results/medium-1.json' }),
      expect.objectContaining({ runId: 'medium-2', resultPath: '/repo/perf/results/medium-2.json' }),
    ]);
  });
});

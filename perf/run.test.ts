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
import type {
  PerfOpenPairOptions,
  PerfOpenPairResult,
} from './runner/openPair';

describe('performance CLI', () => {
  it('defaults to one small full run', () => {
    expect(parsePerfCliArguments([])).toEqual({
      fixture: 'small',
      noBudget: false,
      runs: 1,
      smoke: false,
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
      runOpenPair: vi.fn(),
      vscodeVersion: '1.128.0',
    });

    expect(results).toHaveLength(2);
    expect(launchSession.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ runId: 'medium-1', resultPath: '/repo/perf/results/medium-1.json' }),
      expect.objectContaining({ runId: 'medium-2', resultPath: '/repo/perf/results/medium-2.json' }),
    ]);
  });

  it('runs cold and warm opens in one environment for each full run', async () => {
    const openResult = (runNumber: number): PerfOpenPairResult => ({
      cold: {
        schemaVersion: 1,
        fixture: 'medium',
        runId: `medium-${runNumber}-cold`,
        scenario: 'cold-open',
        metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
      },
      warm: {
        schemaVersion: 1,
        fixture: 'medium',
        runId: `medium-${runNumber}-warm`,
        scenario: 'warm-open',
        metrics: [{ metric: 'warmOpenMs', unit: 'ms', value: 10 }],
      },
    });
    const runOpenPair = vi.fn(async (
      options: PerfOpenPairOptions,
    ): Promise<PerfOpenPairResult> => openResult(options.runNumber));

    const results = await runPerf({
      fixture: 'medium',
      noBudget: true,
      runs: 2,
      smoke: false,
      symbols: false,
    }, {
      launchSession: vi.fn(),
      repoRoot: '/repo',
      runOpenPair,
      vscodeVersion: '1.128.0',
    });

    expect(results.map(result => result.scenario)).toEqual([
      'cold-open',
      'warm-open',
      'cold-open',
      'warm-open',
    ]);
    expect(runOpenPair.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ runNumber: 1, resultDirectory: '/repo/perf/results' }),
      expect.objectContaining({ runNumber: 2, resultDirectory: '/repo/perf/results' }),
    ]);
  });
});

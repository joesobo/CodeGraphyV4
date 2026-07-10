import { describe, expect, it, vi } from 'vitest';
import type { PerfReport } from './report';
import {
  parsePerfCliArguments,
  runPerf,
  type PerfCliOptions,
} from './run';
import type {
  LaunchPerfSessionOptions,
  PerfSmokeResult,
} from './runner/launch';
import type { AssemblePerfReportInput } from './runner/assembleReport';
import type {
  PerfScenarioSuiteOptions,
} from './runner/scenarioSuite';

describe('performance CLI', () => {
  it('defaults to one small full run', () => {
    expect(parsePerfCliArguments([])).toEqual({
      enforceStability: true,
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
      '--skip-stability',
    ])).toEqual({
      enforceStability: false,
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

  it('accepts the isolated self workspace fixture', () => {
    expect(parsePerfCliArguments(['--fixture', 'self'])).toEqual({
      enforceStability: true,
      fixture: 'self',
      noBudget: false,
      runs: 1,
      smoke: false,
      symbols: false,
    });
  });

  it('rejects symbol expansion for the self workspace fixture', () => {
    expect(() => parsePerfCliArguments([
      '--symbols',
      '--fixture',
      'self',
    ])).toThrow('--symbols is not supported for the self performance fixture');
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
      enforceStability: true,
      fixture: 'medium',
      noBudget: true,
      runs: 2,
      smoke: true,
      symbols: false,
    };

    const results = await runPerf(options, {
      launchSession,
      repoRoot: '/repo',
      runScenarioSuite: vi.fn(),
      vscodeVersion: '1.128.0',
    });

    expect(results).toHaveLength(2);
    expect(launchSession.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ runId: 'medium-1', resultPath: '/repo/perf/results/medium-1.json' }),
      expect.objectContaining({ runId: 'medium-2', resultPath: '/repo/perf/results/medium-2.json' }),
    ]);
  });

  it('runs the scripted scenario suite in one environment for each full run', async () => {
    const runScenarioSuite = vi.fn(async (
      options: PerfScenarioSuiteOptions,
    ): Promise<PerfSmokeResult[]> => ([{
      schemaVersion: 1,
      fixture: 'medium',
      runId: `medium-${options.runNumber}-cold-open`,
      scenario: 'cold-open',
      metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
    }, {
      schemaVersion: 1,
      fixture: 'medium',
      runId: `medium-${options.runNumber}-warm-open`,
      scenario: 'warm-open',
      metrics: [{ metric: 'warmOpenMs', unit: 'ms', value: 10 }],
    }]));

    const report = { fixture: 'medium' } as PerfReport;
    const assembleReport = vi.fn((_input: AssemblePerfReportInput) => report);
    const finalizeReports = vi.fn(async () => ({
      outputPath: '/repo/perf/results/medium.json',
      report,
    }));
    const results = await runPerf({
      enforceStability: false,
      fixture: 'medium',
      noBudget: true,
      runs: 2,
      smoke: false,
      symbols: false,
    }, {
      launchSession: vi.fn(),
      repoRoot: '/repo',
      runScenarioSuite,
      vscodeVersion: '1.128.0',
      assembleReport,
      createRunnerMetadata: vi.fn(() => ({ runnerClass: 'local-reference' }) as PerfReport['runner']),
      finalizeReports,
    });

    expect(results.map(result => result.scenario)).toEqual([
      'cold-open',
      'warm-open',
      'cold-open',
      'warm-open',
    ]);
    expect(runScenarioSuite.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ runNumber: 1, resultDirectory: '/repo/perf/results' }),
      expect.objectContaining({ runNumber: 2, resultDirectory: '/repo/perf/results' }),
    ]);
    expect(assembleReport).toHaveBeenCalledTimes(2);
    const firstReportInput = assembleReport.mock.calls[0]?.[0];
    expect(firstReportInput?.variant).toBe('default');
    expect(firstReportInput?.results.map(result => result.scenario)).toEqual([
      'cold-open',
      'warm-open',
    ]);
    expect(finalizeReports).toHaveBeenCalledWith({
      baselineDirectory: '/repo/perf/baselines',
      enforceStability: false,
      noBudget: true,
      outputDirectory: '/repo/perf/results',
      reports: [report, report],
    });
  });

  it('does not assemble or finalize reports for smoke runs', async () => {
    const launchSession = vi.fn(async (
      options: LaunchPerfSessionOptions,
    ): Promise<PerfSmokeResult> => ({
      schemaVersion: 1,
      fixture: options.fixture,
      runId: options.runId,
      scenario: 'cold-open',
      metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
    }));
    const assembleReport = vi.fn();
    const finalizeReports = vi.fn();

    await runPerf({
      enforceStability: true,
      fixture: 'small',
      noBudget: false,
      runs: 1,
      smoke: true,
      symbols: false,
    }, {
      assembleReport,
      createRunnerMetadata: vi.fn(),
      finalizeReports,
      launchSession,
      repoRoot: '/repo',
      runScenarioSuite: vi.fn(),
      vscodeVersion: '1.128.0',
    });

    expect(assembleReport).not.toHaveBeenCalled();
    expect(finalizeReports).not.toHaveBeenCalled();
  });
});

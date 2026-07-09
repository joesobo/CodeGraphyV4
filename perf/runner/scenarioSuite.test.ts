import { describe, expect, it, vi } from 'vitest';

import type { PerfRunEnvironment } from './environment';
import type {
  LaunchPerfSessionOptions,
  PerfSmokeResult,
} from './launch';
import { runPerfScenarioSuite } from './scenarioSuite';

describe('performance scenario suite', () => {
  it('runs every scripted scenario in deterministic order', async () => {
    const dispose = vi.fn(async () => {});
    const environment = {
      fixture: 'small',
      symbols: false,
      dispose,
    } as unknown as PerfRunEnvironment;
    const launchSession = vi.fn(async (
      options: LaunchPerfSessionOptions,
    ): Promise<PerfSmokeResult> => ({
      schemaVersion: 1,
      fixture: options.fixture,
      runId: options.runId,
      scenario: options.scenario ?? 'cold-open',
      metrics: [{
        metric: options.scenario === 'warm-open' ? 'warmOpenMs' : 'coldOpenMs',
        unit: 'ms',
        value: 10,
      }],
    }));

    const results = await runPerfScenarioSuite({
      fixture: 'small',
      repoRoot: '/repo',
      resultDirectory: '/repo/perf/results',
      runNumber: 2,
      vscodeVersion: '1.128.0',
    }, {
      createEnvironment: vi.fn(async () => environment),
      launchSession,
    });

    expect(results.map(result => result.scenario)).toEqual([
      'cold-open',
      'warm-open',
      'single-save',
      'rename',
      'create',
      'delete',
      'batch-100',
      'interaction-burst',
      'scope-toggle',
      'idle-watch',
    ]);
    expect(launchSession.mock.calls.every(call => call[0].environment === environment)).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('disposes the shared environment when a scenario fails', async () => {
    const dispose = vi.fn(async () => {});
    const environment = {
      fixture: 'small',
      symbols: false,
      dispose,
    } as unknown as PerfRunEnvironment;

    await expect(runPerfScenarioSuite({
      fixture: 'small',
      repoRoot: '/repo',
      resultDirectory: '/repo/perf/results',
      runNumber: 1,
      vscodeVersion: '1.128.0',
    }, {
      createEnvironment: vi.fn(async () => environment),
      launchSession: vi.fn(async () => { throw new Error('scenario failed'); }),
    })).rejects.toThrow('scenario failed');

    expect(dispose).toHaveBeenCalledOnce();
  });
});

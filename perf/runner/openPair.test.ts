import { describe, expect, it, vi } from 'vitest';
import type { PerfRunEnvironment } from './environment';
import type { LaunchPerfSessionOptions, PerfSmokeResult } from './launch';
import { runPerfOpenPair } from './openPair';

describe('cold and warm performance pair', () => {
  it('reuses one environment and disposes it after both launches', async () => {
    const environment = {
      dispose: vi.fn(async () => undefined),
      extensionsPath: '/profile/extensions',
      fixture: 'small',
      homePath: '/profile/home',
      rootPath: '/profile',
      symbols: false,
      userDataPath: '/profile/user-data',
      workspacePath: '/workspace',
    } satisfies PerfRunEnvironment;
    const createEnvironment = vi.fn(async () => environment);
    const launchSession = vi.fn(async (
      options: LaunchPerfSessionOptions,
    ): Promise<PerfSmokeResult> => ({
      schemaVersion: 1 as const,
      fixture: 'small' as const,
      runId: options.runId,
      scenario: options.scenario ?? 'cold-open',
      metrics: [{
        metric: options.scenario === 'warm-open' ? 'warmOpenMs' as const : 'coldOpenMs' as const,
        unit: 'ms' as const,
        value: 10,
      }],
    }));

    const result = await runPerfOpenPair({
      fixture: 'small',
      repoRoot: '/repo',
      resultDirectory: '/results',
      runNumber: 1,
      vscodeVersion: '1.128.0',
    }, { createEnvironment, launchSession });

    expect(result.cold.scenario).toBe('cold-open');
    expect(result.warm.scenario).toBe('warm-open');
    expect(launchSession.mock.calls.map(call => call[0].environment)).toEqual([
      environment,
      environment,
    ]);
    expect(environment.dispose).toHaveBeenCalledOnce();
  });
});

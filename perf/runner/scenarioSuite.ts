import { join } from 'node:path';
import {
  createPerfRunEnvironment,
  type CreatePerfRunEnvironmentOptions,
  type PerfRunEnvironment,
} from './environment';
import {
  launchPerfSession,
  type LaunchPerfScenario,
  type LaunchPerfSessionOptions,
  type PerfSmokeResult,
} from './launch';

export const scriptedPerfScenarios = [
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
] as const satisfies readonly LaunchPerfScenario[];

export interface PerfScenarioSuiteOptions {
  fixture: CreatePerfRunEnvironmentOptions['fixture'];
  repoRoot: string;
  resultDirectory: string;
  runNumber: number;
  symbols?: boolean;
  vscodeVersion: string;
}

export interface PerfScenarioSuiteDependencies {
  createEnvironment(
    options: CreatePerfRunEnvironmentOptions,
  ): Promise<PerfRunEnvironment>;
  launchSession(options: LaunchPerfSessionOptions): Promise<PerfSmokeResult>;
}

const defaultDependencies: PerfScenarioSuiteDependencies = {
  createEnvironment: createPerfRunEnvironment,
  launchSession: options => launchPerfSession(options),
};

export async function runPerfScenarioSuite(
  options: PerfScenarioSuiteOptions,
  dependencies: PerfScenarioSuiteDependencies = defaultDependencies,
): Promise<PerfSmokeResult[]> {
  const environment = await dependencies.createEnvironment({
    fixture: options.fixture,
    repoRoot: options.repoRoot,
    symbols: options.symbols,
  });
  const variant = options.symbols ? '-symbols' : '';
  const runPrefix = `${options.fixture}${variant}-${options.runNumber}`;

  try {
    const results: PerfSmokeResult[] = [];
    for (const scenario of scriptedPerfScenarios) {
      const runId = `${runPrefix}-${scenario}`;
      results.push(await dependencies.launchSession({
        environment,
        fixture: options.fixture,
        repoRoot: options.repoRoot,
        resultPath: join(options.resultDirectory, `${runId}.json`),
        runId,
        scenario,
        symbols: options.symbols,
        vscodeVersion: options.vscodeVersion,
      }));
    }
    return results;
  } finally {
    await environment.dispose();
  }
}

import { join } from 'node:path';
import {
  createPerfRunEnvironment,
  type CreatePerfRunEnvironmentOptions,
  type PerfRunEnvironment,
} from './environment';
import {
  launchPerfSession,
  type LaunchPerfSessionOptions,
  type PerfSmokeResult,
} from './launch';

export interface PerfOpenPairOptions {
  fixture: CreatePerfRunEnvironmentOptions['fixture'];
  repoRoot: string;
  resultDirectory: string;
  runNumber: number;
  symbols?: boolean;
  vscodeVersion: string;
}

export interface PerfOpenPairResult {
  cold: PerfSmokeResult;
  warm: PerfSmokeResult;
}

interface PerfOpenPairDependencies {
  createEnvironment(
    options: CreatePerfRunEnvironmentOptions,
  ): Promise<PerfRunEnvironment>;
  launchSession(options: LaunchPerfSessionOptions): Promise<PerfSmokeResult>;
}

const defaultDependencies: PerfOpenPairDependencies = {
  createEnvironment: createPerfRunEnvironment,
  launchSession: options => launchPerfSession(options),
};

export async function runPerfOpenPair(
  options: PerfOpenPairOptions,
  dependencies: PerfOpenPairDependencies = defaultDependencies,
): Promise<PerfOpenPairResult> {
  const environment = await dependencies.createEnvironment({
    fixture: options.fixture,
    repoRoot: options.repoRoot,
    symbols: options.symbols,
  });
  const variant = options.symbols ? '-symbols' : '';
  const runPrefix = `${options.fixture}${variant}-${options.runNumber}`;
  const common = {
    environment,
    fixture: options.fixture,
    repoRoot: options.repoRoot,
    symbols: options.symbols,
    vscodeVersion: options.vscodeVersion,
  } as const;

  try {
    const cold = await dependencies.launchSession({
      ...common,
      resultPath: join(options.resultDirectory, `${runPrefix}-cold.json`),
      runId: `${runPrefix}-cold`,
      scenario: 'cold-open',
    });
    const warm = await dependencies.launchSession({
      ...common,
      resultPath: join(options.resultDirectory, `${runPrefix}-warm.json`),
      runId: `${runPrefix}-warm`,
      scenario: 'warm-open',
    });
    return { cold, warm };
  } finally {
    await environment.dispose();
  }
}

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arch, cpus, platform } from 'node:os';
import type { PerfFixture, PerfReport } from './report';
import {
  assemblePerfReport,
  type AssemblePerfReportInput,
} from './runner/assembleReport';
import {
  finalizePerfReports,
  type FinalizePerfReportsOptions,
  type FinalizedPerfReport,
} from './runner/finalReport';
import {
  launchPerfSession,
  type LaunchPerfSessionOptions,
  type PerfSmokeResult,
} from './runner/launch';
import {
  runPerfScenarioSuite,
  type PerfScenarioSuiteOptions,
} from './runner/scenarioSuite';
import { createPerfRunnerMetadata } from './runner/metadata';

const fixtureNames = [
  'small',
  'medium',
  'large',
  'huge',
  'giant',
  'self',
] as const satisfies readonly PerfFixture[];

export interface PerfCliOptions {
  fixture: PerfFixture;
  noBudget: boolean;
  runs: number;
  smoke: boolean;
  symbols: boolean;
}

interface PerfRunDependencies {
  assembleReport?: (input: AssemblePerfReportInput) => PerfReport;
  createRunnerMetadata?: (vscodeVersion: string) => PerfReport['runner'];
  finalizeReports?: (
    options: FinalizePerfReportsOptions,
  ) => Promise<FinalizedPerfReport>;
  launchSession(options: LaunchPerfSessionOptions): Promise<PerfSmokeResult>;
  repoRoot: string;
  runScenarioSuite(options: PerfScenarioSuiteOptions): Promise<PerfSmokeResult[]>;
  vscodeVersion: string;
}

function requireOptionValue(arguments_: string[], index: number, option: string): string {
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseFixture(value: string): PerfFixture {
  if (!fixtureNames.includes(value as PerfFixture)) {
    throw new Error(`Unknown performance fixture: ${value}`);
  }
  return value as PerfFixture;
}

function parseRuns(value: string): number {
  const runs = Number(value);
  if (!Number.isSafeInteger(runs) || runs < 1) {
    throw new Error(`--runs must be a positive integer: ${value}`);
  }
  return runs;
}

export function parsePerfCliArguments(arguments_: string[]): PerfCliOptions {
  const options: PerfCliOptions = {
    fixture: 'small',
    noBudget: false,
    runs: 1,
    smoke: false,
    symbols: false,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    switch (argument) {
      case '--':
        break;
      case '--fixture':
        options.fixture = parseFixture(requireOptionValue(arguments_, index, argument));
        index += 1;
        break;
      case '--runs':
        options.runs = parseRuns(requireOptionValue(arguments_, index, argument));
        index += 1;
        break;
      case '--smoke':
        options.smoke = true;
        break;
      case '--symbols':
        options.symbols = true;
        break;
      case '--no-budget':
        options.noBudget = true;
        break;
      default:
        throw new Error(`Unknown performance option: ${argument}`);
    }
  }

  if (options.fixture === 'self' && options.symbols) {
    throw new Error('--symbols is not supported for the self performance fixture');
  }

  return options;
}

export async function runPerf(
  options: PerfCliOptions,
  dependencies: PerfRunDependencies,
): Promise<PerfSmokeResult[]> {
  const results: PerfSmokeResult[] = [];
  const reports: PerfReport[] = [];
  const runIdVariant = options.symbols ? '-symbols' : '';
  const reportVariant: PerfReport['variant'] = options.symbols
    ? 'symbols'
    : 'default';
  const assembleReport = dependencies.assembleReport ?? assemblePerfReport;
  const finalizeReports = dependencies.finalizeReports ?? finalizePerfReports;
  const createRunnerMetadata = dependencies.createRunnerMetadata
    ?? ((vscodeVersion: string) => createPerfRunnerMetadata({
      arch: () => arch(),
      cpuModels: () => cpus().map(cpu => cpu.model),
      nodeVersion: process.version,
      os: () => platform(),
      runnerClass: process.env.CODEGRAPHY_PERF_RUNNER_CLASS ?? 'local-reference',
      vscodeVersion,
    }));
  const runner = options.smoke
    ? undefined
    : createRunnerMetadata(dependencies.vscodeVersion);

  for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
    if (!options.smoke) {
      const suite = await dependencies.runScenarioSuite({
        fixture: options.fixture,
        repoRoot: dependencies.repoRoot,
        resultDirectory: join(dependencies.repoRoot, 'perf', 'results'),
        runNumber,
        symbols: options.symbols,
        vscodeVersion: dependencies.vscodeVersion,
      });
      results.push(...suite);
      reports.push(assembleReport({
        results: suite,
        runner: runner!,
        variant: reportVariant,
      }));
      continue;
    }

    const runId = `${options.fixture}${runIdVariant}-${runNumber}`;
    results.push(await dependencies.launchSession({
      fixture: options.fixture,
      repoRoot: dependencies.repoRoot,
      resultPath: join(dependencies.repoRoot, 'perf', 'results', `${runId}.json`),
      runId,
      symbols: options.symbols,
      vscodeVersion: dependencies.vscodeVersion,
    }));
  }

  if (!options.smoke) {
    await finalizeReports({
      baselineDirectory: join(dependencies.repoRoot, 'perf', 'baselines'),
      noBudget: options.noBudget,
      outputDirectory: join(dependencies.repoRoot, 'perf', 'results'),
      reports,
    });
  }

  return results;
}

async function main(): Promise<void> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const options = parsePerfCliArguments(process.argv.slice(2));
  const results = await runPerf(options, {
    launchSession: launchPerfSession,
    repoRoot,
    runScenarioSuite: runPerfScenarioSuite,
    vscodeVersion: process.env.CODEGRAPHY_VSCODE_TEST_VERSION ?? '1.128.0',
  });
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

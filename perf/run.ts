import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  launchPerfSession,
  type LaunchPerfSessionOptions,
  type PerfSmokeResult,
} from './runner/launch';
import {
  runPerfOpenPair,
  type PerfOpenPairOptions,
  type PerfOpenPairResult,
} from './runner/openPair';

const fixtureNames = ['small', 'medium', 'large', 'huge', 'giant'] as const;
type GeneratedFixtureName = typeof fixtureNames[number];

export interface PerfCliOptions {
  fixture: GeneratedFixtureName;
  noBudget: boolean;
  runs: number;
  smoke: boolean;
  symbols: boolean;
}

interface PerfRunDependencies {
  launchSession(options: LaunchPerfSessionOptions): Promise<PerfSmokeResult>;
  repoRoot: string;
  runOpenPair(options: PerfOpenPairOptions): Promise<PerfOpenPairResult>;
  vscodeVersion: string;
}

function requireOptionValue(arguments_: string[], index: number, option: string): string {
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseFixture(value: string): GeneratedFixtureName {
  if (!fixtureNames.includes(value as GeneratedFixtureName)) {
    throw new Error(`Unknown performance fixture: ${value}`);
  }
  return value as GeneratedFixtureName;
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

  return options;
}

export async function runPerf(
  options: PerfCliOptions,
  dependencies: PerfRunDependencies,
): Promise<PerfSmokeResult[]> {
  const results: PerfSmokeResult[] = [];
  const variant = options.symbols ? '-symbols' : '';

  for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
    if (!options.smoke) {
      const pair = await dependencies.runOpenPair({
        fixture: options.fixture,
        repoRoot: dependencies.repoRoot,
        resultDirectory: join(dependencies.repoRoot, 'perf', 'results'),
        runNumber,
        symbols: options.symbols,
        vscodeVersion: dependencies.vscodeVersion,
      });
      results.push(pair.cold, pair.warm);
      continue;
    }

    const runId = `${options.fixture}${variant}-${runNumber}`;
    results.push(await dependencies.launchSession({
      fixture: options.fixture,
      repoRoot: dependencies.repoRoot,
      resultPath: join(dependencies.repoRoot, 'perf', 'results', `${runId}.json`),
      runId,
      symbols: options.symbols,
      vscodeVersion: dependencies.vscodeVersion,
    }));
  }

  return results;
}

async function main(): Promise<void> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const options = parsePerfCliArguments(process.argv.slice(2));
  const results = await runPerf(options, {
    launchSession: launchPerfSession,
    repoRoot,
    runOpenPair: runPerfOpenPair,
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

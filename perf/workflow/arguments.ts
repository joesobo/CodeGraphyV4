import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hasPerfBaselineReport } from '../baselines/command';
import type { PerfFixture, PerfVariant } from '../report';

export interface PerfWorkflowArgumentOptions {
  baselineDirectory: string;
  eventName: 'pull_request' | 'workflow_dispatch';
  fixture: PerfFixture;
  runnerClass: string;
  symbols: boolean;
  variant: PerfVariant;
}

const fixtureNames = new Set<PerfFixture>([
  'small',
  'medium',
  'large',
  'huge',
  'giant',
  'self',
]);
const variantNames = new Set<PerfVariant>(['default', 'symbols']);

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseFixture(value: string): PerfFixture {
  if (!fixtureNames.has(value as PerfFixture)) {
    throw new Error(`Unknown performance fixture: ${value}`);
  }
  return value as PerfFixture;
}

function parseVariant(value: string): PerfVariant {
  if (!variantNames.has(value as PerfVariant)) {
    throw new Error(`Unknown performance variant: ${value}`);
  }
  return value as PerfVariant;
}

function parseSymbols(value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`PERF_SYMBOLS must be true or false: ${value}`);
}

function parseEventName(
  value: string,
): PerfWorkflowArgumentOptions['eventName'] {
  if (value === 'pull_request' || value === 'workflow_dispatch') return value;
  throw new Error(`Unsupported performance workflow event: ${value}`);
}

export async function resolvePerfWorkflowArguments(
  options: PerfWorkflowArgumentOptions,
): Promise<string[]> {
  const arguments_ = [
    '--fixture',
    options.fixture,
    '--runs',
    '3',
    '--skip-stability',
  ];
  if (options.symbols) arguments_.push('--symbols');

  const baselinePath = join(
    options.baselineDirectory,
    `${options.runnerClass}.json`,
  );
  const baselineKey = `${options.fixture}:${options.variant}`;
  if (
    options.eventName === 'workflow_dispatch'
    && !await hasPerfBaselineReport(baselinePath, baselineKey)
  ) {
    arguments_.push('--no-budget');
  }
  return arguments_;
}

async function main(): Promise<void> {
  const baselineDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../baselines',
  );
  const arguments_ = await resolvePerfWorkflowArguments({
    baselineDirectory,
    eventName: parseEventName(requireEnvironmentVariable('GITHUB_EVENT_NAME')),
    fixture: parseFixture(requireEnvironmentVariable('PERF_FIXTURE')),
    runnerClass: requireEnvironmentVariable('CODEGRAPHY_PERF_RUNNER_CLASS'),
    symbols: parseSymbols(requireEnvironmentVariable('PERF_SYMBOLS')),
    variant: parseVariant(requireEnvironmentVariable('PERF_VARIANT')),
  });
  process.stdout.write(`${arguments_.join('\n')}\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

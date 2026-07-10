import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createPerfReport } from '../baselines/test/report';
import { resolvePerfWorkflowArguments } from './arguments';

const temporaryDirectories: string[] = [];

async function createBaselineDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'codegraphy-perf-workflow-'));
  temporaryDirectories.push(root);
  const baselineDirectory = join(root, 'baselines');
  await mkdir(baselineDirectory);
  return baselineDirectory;
}

async function writeBaseline(
  baselineDirectory: string,
  runnerClass: string,
  key: string,
): Promise<void> {
  const report = createPerfReport();
  report.fixture = key.split(':')[0] as typeof report.fixture;
  report.variant = key.split(':')[1] as typeof report.variant;
  report.runner.runnerClass = runnerClass;
  await writeFile(
    join(baselineDirectory, `${runnerClass}.json`),
    `${JSON.stringify({
      schemaVersion: 1,
      runnerClass,
      reports: { [key]: report },
    }, null, 2)}\n`,
    'utf8',
  );
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => (
    rm(path, { force: true, recursive: true })
  )));
});

describe('performance workflow arguments', () => {
  it('keeps a selected runner-class report budgeted', async () => {
    const baselineDirectory = await createBaselineDirectory();
    await writeBaseline(baselineDirectory, 'linux-x64', 'small:default');

    await expect(resolvePerfWorkflowArguments({
      baselineDirectory,
      eventName: 'workflow_dispatch',
      fixture: 'small',
      runnerClass: 'linux-x64',
      symbols: false,
      variant: 'default',
    })).resolves.toEqual([
      '--fixture',
      'small',
      '--runs',
      '3',
      '--skip-stability',
    ]);
  });

  it('bootstraps a missing selected runner-class variant without a budget', async () => {
    const baselineDirectory = await createBaselineDirectory();
    await Promise.all([
      writeBaseline(baselineDirectory, 'linux-x64', 'giant:default'),
      writeBaseline(baselineDirectory, 'macos-arm64', 'giant:symbols'),
    ]);

    await expect(resolvePerfWorkflowArguments({
      baselineDirectory,
      eventName: 'workflow_dispatch',
      fixture: 'giant',
      runnerClass: 'linux-x64',
      symbols: true,
      variant: 'symbols',
    })).resolves.toEqual([
      '--fixture',
      'giant',
      '--runs',
      '3',
      '--skip-stability',
      '--symbols',
      '--no-budget',
    ]);
  });

  it('does not weaken a pull-request budget when its baseline is missing', async () => {
    const baselineDirectory = await createBaselineDirectory();

    await expect(resolvePerfWorkflowArguments({
      baselineDirectory,
      eventName: 'pull_request',
      fixture: 'small',
      runnerClass: 'linux-x64',
      symbols: false,
      variant: 'default',
    })).resolves.toEqual([
      '--fixture',
      'small',
      '--runs',
      '3',
      '--skip-stability',
    ]);
  });
});

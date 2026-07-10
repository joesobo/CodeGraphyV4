import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  adoptPerfBaselineReports,
  hasPerfBaselineReport,
  parsePerfBaselineCommandArguments,
} from './command';
import { createPerfReport } from './test/report';

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'codegraphy-baseline-command-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => (
    rm(path, { force: true, recursive: true })
  )));
});

describe('performance baseline command', () => {
  it('parses adoption and report-presence commands', () => {
    expect(parsePerfBaselineCommandArguments(['small.json', 'medium.json']))
      .toEqual({
        kind: 'adopt',
        reportPaths: ['small.json', 'medium.json'],
      });
    expect(parsePerfBaselineCommandArguments([
      '--',
      '--has',
      'linux-x64.json',
      'medium:default',
    ])).toEqual({
      documentPath: 'linux-x64.json',
      key: 'medium:default',
      kind: 'has',
    });
  });

  it('requires complete command arguments', () => {
    expect(() => parsePerfBaselineCommandArguments([])).toThrow(
      'At least one median performance report path is required',
    );
    expect(() => parsePerfBaselineCommandArguments(['--has', 'linux-x64.json']))
      .toThrow('--has requires a baseline document path and report key');
  });

  it('writes and incrementally updates a deterministic runner-class document', async () => {
    const root = await createTemporaryDirectory();
    const results = join(root, 'results');
    const baselines = join(root, 'baselines');
    await mkdir(results);
    const smallPath = join(results, 'small.json');
    const mediumPath = join(results, 'medium.json');
    const small = createPerfReport();
    const medium = createPerfReport();
    medium.fixture = 'medium';
    await Promise.all([
      writeJson(smallPath, small),
      writeJson(mediumPath, medium),
    ]);

    await expect(adoptPerfBaselineReports({
      baselineDirectory: baselines,
      reportPaths: [smallPath],
    })).resolves.toBe(join(baselines, 'linux-x64.json'));

    const replacementSmall = structuredClone(small);
    replacementSmall.metrics.coldOpenMs = 1_234;
    await writeJson(smallPath, replacementSmall);
    await adoptPerfBaselineReports({
      baselineDirectory: baselines,
      reportPaths: [mediumPath, smallPath],
    });

    const outputPath = join(baselines, 'linux-x64.json');
    const output = await readFile(outputPath, 'utf8');
    expect(output.endsWith('\n')).toBe(true);
    expect(output.indexOf('"medium:default"'))
      .toBeLessThan(output.indexOf('"small:default"'));
    expect(JSON.parse(output)).toEqual({
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: {
        'medium:default': medium,
        'small:default': replacementSmall,
      },
    });
    expect((await readdir(baselines)).sort()).toEqual(['linux-x64.json']);
  });

  it('rejects a scenario result instead of adopting an incomplete report', async () => {
    const root = await createTemporaryDirectory();
    const scenarioPath = join(root, 'medium-1-cold-open.json');
    await writeJson(scenarioPath, {
      fixture: 'medium',
      metrics: [],
      runId: 'medium-1-cold-open',
      scenario: 'cold-open',
      schemaVersion: 1,
    });

    await expect(adoptPerfBaselineReports({
      baselineDirectory: join(root, 'baselines'),
      reportPaths: [scenarioPath],
    })).rejects.toThrow(/variant/);
  });

  it('rejects an unsafe runner class before writing outside the baseline directory', async () => {
    const root = await createTemporaryDirectory();
    const reportPath = join(root, 'unsafe.json');
    const report = createPerfReport();
    report.runner.runnerClass = '../escaped';
    await writeJson(reportPath, report);

    await expect(adoptPerfBaselineReports({
      baselineDirectory: join(root, 'baselines'),
      reportPaths: [reportPath],
    })).rejects.toThrow(/runner class/i);
    await expect(readdir(root)).resolves.toEqual(['unsafe.json']);
  });

  it('checks one fixture key and treats a missing document as absent', async () => {
    const root = await createTemporaryDirectory();
    const documentPath = join(root, 'linux-x64.json');
    const report = createPerfReport();
    await writeJson(documentPath, {
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': report },
    });

    await expect(hasPerfBaselineReport(documentPath, 'small:default'))
      .resolves.toBe(true);
    await expect(hasPerfBaselineReport(documentPath, 'medium:default'))
      .resolves.toBe(false);
    await expect(hasPerfBaselineReport(join(root, 'missing.json'), 'small:default'))
      .resolves.toBe(false);
  });
});

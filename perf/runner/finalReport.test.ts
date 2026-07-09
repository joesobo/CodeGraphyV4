import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PerfReport } from '../report';
import {
  finalizePerfReports,
  readPerfBaselineDocuments,
} from './finalReport';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => (
    rm(path, { force: true, recursive: true })
  )));
});

describe('final performance report', () => {
  it('enforces stability without loading baselines when budgets are disabled', async () => {
    const report = { fixture: 'small' } as PerfReport;
    const assertStability = vi.fn(() => ({ medianReport: report }));
    const assertBudget = vi.fn();
    const readBaselineDocuments = vi.fn();
    const writeReport = vi.fn(async () => '/results/small.json');

    await expect(finalizePerfReports({
      baselineDirectory: '/baselines',
      noBudget: true,
      outputDirectory: '/results',
      reports: [report],
    }, {
      assertBudget,
      assertStability,
      readBaselineDocuments,
      writeReport,
    })).resolves.toEqual({
      outputPath: '/results/small.json',
      report,
    });

    expect(assertStability).toHaveBeenCalledWith([report]);
    expect(readBaselineDocuments).not.toHaveBeenCalled();
    expect(assertBudget).not.toHaveBeenCalled();
    expect(writeReport).toHaveBeenCalledWith('/results', report);
  });

  it('uses runner-class baselines when budgets are enabled', async () => {
    const report = { fixture: 'small' } as PerfReport;
    const baselineDocuments = [{ runnerClass: 'linux-x64' }];
    const assertBudget = vi.fn(() => ({ medianReport: report }));
    const writeReport = vi.fn(async () => '/results/small.json');

    await finalizePerfReports({
      baselineDirectory: '/baselines',
      noBudget: false,
      outputDirectory: '/results',
      reports: [report],
    }, {
      assertBudget,
      assertStability: vi.fn(),
      readBaselineDocuments: vi.fn(async () => baselineDocuments),
      writeReport,
    });

    expect(assertBudget).toHaveBeenCalledWith({
      baselineDocuments,
      reports: [report],
    });
    expect(writeReport).toHaveBeenCalledWith('/results', report);
  });

  it('reads baseline JSON documents in deterministic filename order', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codegraphy-baselines-'));
    temporaryDirectories.push(directory);
    await Promise.all([
      writeFile(join(directory, 'z.json'), '{"runnerClass":"z"}\n'),
      writeFile(join(directory, 'a.json'), '{"runnerClass":"a"}\n'),
      writeFile(join(directory, 'notes.md'), 'not a baseline'),
    ]);

    await expect(readPerfBaselineDocuments(directory)).resolves.toEqual([
      { runnerClass: 'a' },
      { runnerClass: 'z' },
    ]);
  });
});

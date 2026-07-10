import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  assertPerfBudget,
  assertPerfStability,
  type PerfStabilityLimits,
} from '../baselines/budget';
import {
  writePerfReport,
  type PerfReport,
} from '../report';

export interface FinalizePerfReportsOptions {
  baselineDirectory: string;
  enforceStability: boolean;
  noBudget: boolean;
  outputDirectory: string;
  reports: readonly PerfReport[];
}

export interface FinalizedPerfReport {
  outputPath: string;
  report: PerfReport;
}

interface ReportEvaluation {
  medianReport: PerfReport;
}

interface FinalizePerfReportsDependencies {
  assertBudget(input: {
    baselineDocuments: readonly unknown[];
    reports: readonly PerfReport[];
    stabilityLimits?: PerfStabilityLimits;
  }): ReportEvaluation;
  assertStability(
    reports: readonly PerfReport[],
    limits?: PerfStabilityLimits,
  ): ReportEvaluation;
  readBaselineDocuments(directory: string): Promise<unknown[]>;
  writeReport(outputDirectory: string, report: PerfReport): Promise<string>;
}

const defaultDependencies: FinalizePerfReportsDependencies = {
  assertBudget: assertPerfBudget,
  assertStability: assertPerfStability,
  readBaselineDocuments: directory => readPerfBaselineDocuments(directory),
  writeReport: writePerfReport,
};

export async function readPerfBaselineDocuments(
  directory: string,
): Promise<unknown[]> {
  const filenames = (await readdir(directory))
    .filter(filename => filename.endsWith('.json'))
    .sort();
  return Promise.all(filenames.map(async filename => (
    JSON.parse(await readFile(join(directory, filename), 'utf8')) as unknown
  )));
}

export async function finalizePerfReports(
  options: FinalizePerfReportsOptions,
  dependencyOverrides: Partial<FinalizePerfReportsDependencies> = {},
): Promise<FinalizedPerfReport> {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  const stabilityLimits = options.enforceStability
    ? undefined
    : {
        ratio: Number.POSITIVE_INFINITY,
        timing: Number.POSITIVE_INFINITY,
      };
  const evaluation = options.noBudget
    ? stabilityLimits
      ? dependencies.assertStability(options.reports, stabilityLimits)
      : dependencies.assertStability(options.reports)
    : dependencies.assertBudget({
        baselineDocuments: await dependencies.readBaselineDocuments(
          options.baselineDirectory,
        ),
        reports: options.reports,
        ...(stabilityLimits ? { stabilityLimits } : {}),
      });
  const outputPath = await dependencies.writeReport(
    options.outputDirectory,
    evaluation.medianReport,
  );
  return { outputPath, report: evaluation.medianReport };
}

import { z } from 'zod';

import {
  perfReportSchema,
  type PerfReport,
} from '../report';

const nonemptyStringSchema = z.string().min(1);

export function createPerfReportKey(
  report: Pick<PerfReport, 'fixture' | 'variant'>,
): string {
  return `${report.fixture}:${report.variant}`;
}

export const perfBaselineDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runnerClass: nonemptyStringSchema,
  reports: z.record(nonemptyStringSchema, perfReportSchema).refine(
    reports => Object.keys(reports).length > 0,
    'At least one baseline report is required',
  ),
}).superRefine((document, issues) => {
  for (const [key, report] of Object.entries(document.reports)) {
    const expectedKey = createPerfReportKey(report);
    if (key !== expectedKey) {
      issues.addIssue({
        code: 'custom',
        path: ['reports', key],
        message: `Baseline report key ${key} must be ${expectedKey}`,
      });
    }
    if (report.runner.runnerClass !== document.runnerClass) {
      issues.addIssue({
        code: 'custom',
        path: ['reports', key, 'runner', 'runnerClass'],
        message: `Baseline report ${key} must use runner class ${document.runnerClass}`,
      });
    }
  }
});

export type PerfBaselineDocument = z.infer<typeof perfBaselineDocumentSchema>;

export function parsePerfBaselineDocument(value: unknown): PerfBaselineDocument {
  return perfBaselineDocumentSchema.parse(value);
}

export function selectPerfBaselineReport(
  values: readonly unknown[],
  currentValue: unknown,
): PerfReport {
  const current = perfReportSchema.parse(currentValue);
  const documents = values.map(parsePerfBaselineDocument);
  const matches = documents.filter(
    document => document.runnerClass === current.runner.runnerClass,
  );
  if (matches.length === 0) {
    throw new Error(
      `Missing baseline document for runner class ${current.runner.runnerClass}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Duplicate baseline documents for runner class ${current.runner.runnerClass}`,
    );
  }

  const key = createPerfReportKey(current);
  const report = matches[0].reports[key];
  if (!report) {
    throw new Error(
      `Missing baseline report ${key} for runner class ${current.runner.runnerClass}`,
    );
  }
  return report;
}

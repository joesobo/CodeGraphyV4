import { z } from 'zod';

import {
  perfReportSchema,
  perfRunnerClassSchema,
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
  runnerClass: perfRunnerClassSchema,
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

function sortBaselineReports(
  reports: Readonly<Record<string, PerfReport>>,
): Record<string, PerfReport> {
  return Object.fromEntries(
    Object.entries(reports).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function mergePerfBaselineReports(
  existingValue: unknown,
  reportValues: readonly unknown[],
): PerfBaselineDocument {
  if (reportValues.length === 0) {
    throw new Error('At least one baseline report input is required');
  }

  const reports = reportValues.map(value => perfReportSchema.parse(value));
  const runnerClasses = new Set(reports.map(report => report.runner.runnerClass));
  if (runnerClasses.size !== 1) {
    throw new Error('Baseline reports must use one runner class');
  }
  const runnerClass = reports[0].runner.runnerClass;
  const existing = existingValue === undefined
    ? undefined
    : parsePerfBaselineDocument(existingValue);
  if (existing && existing.runnerClass !== runnerClass) {
    throw new Error(
      `Cannot merge ${runnerClass} reports into ${existing.runnerClass} baseline`,
    );
  }

  const inputKeys = new Set<string>();
  const mergedReports: Record<string, PerfReport> = {
    ...(existing?.reports ?? {}),
  };
  for (const report of reports) {
    const key = createPerfReportKey(report);
    if (inputKeys.has(key)) {
      throw new Error(`Duplicate baseline report input ${key}`);
    }
    inputKeys.add(key);
    mergedReports[key] = report;
  }

  return parsePerfBaselineDocument({
    schemaVersion: 1,
    runnerClass,
    reports: sortBaselineReports(mergedReports),
  });
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

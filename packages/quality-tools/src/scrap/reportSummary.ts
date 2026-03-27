import { relative } from 'path';
import { type ScrapFileMetric } from './metrics';

function summaryCount(value: number | undefined): number {
  return value ?? 0;
}

function coreSummaryLines(metric: ScrapFileMetric): string[] {
  return [
    `  mode: ${metric.remediationMode}`,
    `  examples: ${metric.exampleCount}`,
    `  avg/max: ${metric.averageScore} / ${metric.maxScore}`,
    `  actionability: ${metric.aiActionability ?? 'LEAVE_ALONE'}`
  ];
}

function duplicationSummaryLines(metric: ScrapFileMetric): string[] {
  return [
    `  zero-assertion: ${metric.zeroAssertionExampleCount}`,
    `  low-assertion: ${metric.lowAssertionExampleCount}`,
    `  branching: ${metric.branchingExampleCount}`,
    `  duplicate-setup: ${metric.duplicateSetupExampleCount}`,
    `  helper-hidden: ${metric.helperHiddenExampleCount}`,
    `  coverage-matrix: ${metric.coverageMatrixCandidateCount ?? 0}`,
    `  extraction-pressure: ${metric.extractionPressureScore ?? 0}`
  ];
}

function cohesionSummaryLines(metric: ScrapFileMetric): string[] {
  return [
    `  subjects: ${metric.distinctSubjectCount ?? 0}`,
    `  subject-overlap: ${metric.averageSubjectOverlap ?? 0}`,
    `  shape-diversity: ${metric.exampleShapeDiversity ?? 0}`
  ];
}

function vitestSignalCounts(metric: ScrapFileMetric): string {
  const snapshots = summaryCount(metric.snapshotExampleCount);
  const waits = summaryCount(metric.asyncWaitExampleCount);
  const fakeTimers = summaryCount(metric.fakeTimerExampleCount);
  const envMutations = summaryCount(metric.envMutationExampleCount);
  const concurrent = summaryCount(metric.concurrencyExampleCount);
  const typeOnly = summaryCount(metric.typeOnlyAssertionExampleCount);

  return `  vitest-signals: snapshots=${snapshots} waits=${waits} fake-timers=${fakeTimers} env/global=${envMutations} concurrent=${concurrent} type-only=${typeOnly}`;
}

function vitestSummaryLines(metric: ScrapFileMetric): string[] {
  return [
    vitestSignalCounts(metric),
    `  temp-resources: ${summaryCount(metric.tempResourceExampleCount)}`,
    `  validation-issues: ${metric.validationIssues?.length ?? 0}`
  ];
}

export function summaryLines(metric: ScrapFileMetric, repoRoot: string): string[] {
  return [
    `\n${relative(repoRoot, metric.filePath)}`,
    ...coreSummaryLines(metric),
    ...duplicationSummaryLines(metric),
    ...cohesionSummaryLines(metric),
    ...vitestSummaryLines(metric)
  ];
}

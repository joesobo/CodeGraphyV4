import { relative } from 'path';
import { type ScrapFileMetric } from './scrapTypes';

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
    `  fixture-duplication: ${metric.fixtureDuplicationScore ?? 0}`,
    `  literal-duplication: ${metric.literalDuplicationScore ?? 0}`,
    `  helper-hidden: ${metric.helperHiddenExampleCount}`,
    `  coverage-matrix: ${metric.coverageMatrixCandidateCount ?? 0}`,
    `  extraction-pressure: ${metric.extractionPressureScore ?? 0}`
  ];
}

function cohesionSummaryLines(metric: ScrapFileMetric): string[] {
  return [
    `  subjects: ${metric.distinctSubjectCount ?? 0}`,
    `  subject-overlap: ${metric.averageSubjectOverlap ?? 0}`,
    `  shape-diversity: ${metric.exampleShapeDiversity ?? 0}`,
    `  fixture-diversity: ${metric.fixtureShapeDiversity ?? 0}`
  ];
}

function vitestSignalCounts(metric: ScrapFileMetric): string {
  const snapshots = summaryCount(metric.snapshotExampleCount);
  const waits = summaryCount(metric.asyncWaitExampleCount);
  const fakeTimers = summaryCount(metric.fakeTimerExampleCount);
  const moduleMocks = summaryCount(metric.moduleMockExampleCount);
  const envMutations = summaryCount(metric.envMutationExampleCount);
  const concurrent = summaryCount(metric.concurrencyExampleCount);
  const typeOnly = summaryCount(metric.typeOnlyAssertionExampleCount);
  const rtlRender = summaryCount(metric.rtlRenderExampleCount);
  const rtlQueryHeavy = summaryCount(metric.rtlQueryHeavyExampleCount);
  const rtlMutations = summaryCount(metric.rtlMutationExampleCount);

  return `  vitest-signals: snapshots=${snapshots} waits=${waits} fake-timers=${fakeTimers} module-mocks=${moduleMocks} env/global=${envMutations} concurrent=${concurrent} type-only=${typeOnly} rtl-renders=${rtlRender} rtl-query-heavy=${rtlQueryHeavy} rtl-mutations=${rtlMutations}`;
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

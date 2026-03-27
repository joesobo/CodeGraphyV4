import { type ScrapFileMetric } from './scrapTypes';

export function worstExampleLines(metric: ScrapFileMetric): string[] {
  if (metric.worstExamples.length === 0) {
    return [];
  }

  return [
    '  worst examples:',
    ...metric.worstExamples.map(
      (example) =>
        `    - ${example.name} (L${example.startLine}-L${example.endLine}) score=${example.score} assertions=${example.assertionCount} branches=${example.branchCount} mocks=${example.mockCount} setup=${example.setupLineCount} dupes=${example.duplicateSetupGroupSize} helpers=${example.helperCallCount} hidden=${example.helperHiddenLineCount}`
    )
  ];
}

export function verboseExampleLines(metric: ScrapFileMetric): string[] {
  return [
    '  verbose examples:',
    ...metric.worstExamples.map(
      (example) =>
        `    - ${example.name} tableDriven=${example.tableDriven} setupDepth=${example.setupDepth} tempResources=${example.tempResourceCount} snapshots=${example.snapshotCount ?? 0} waits=${example.asyncWaitCount ?? 0} fakeTimers=${example.fakeTimerCount ?? 0} moduleMocks=${example.moduleMockCount ?? 0} envMutations=${example.envMutationCount ?? 0} concurrent=${example.concurrencyCount ?? 0} typeOnly=${example.typeOnlyAssertionCount ?? 0}`
    )
  ];
}

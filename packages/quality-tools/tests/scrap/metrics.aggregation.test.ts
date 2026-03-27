import * as ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapExampleMetric } from '../../src/scrap/metrics';

let metrics: ScrapExampleMetric[] = [];

vi.mock('../../src/scrap/scoredExamples', () => ({
  analyzeFileExamples: vi.fn(() => metrics)
}));

function sourceFile(): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('analyzeScrapFile aggregation', () => {
  beforeEach(() => {
    metrics = [];
    vi.resetModules();
  });

  it('rounds averages, counts hot examples, and keeps the worst five examples', async () => {
    metrics = [
      { assertionCount: 2, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 5, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 3, mockCount: 0, name: 'a', score: 2, setupLineCount: 0, startLine: 1 },
      { assertionCount: 1, blockPath: ['suite'], branchCount: 1, describeDepth: 1, duplicateSetupGroupSize: 2, endLine: 10, helperCallCount: 1, helperHiddenLineCount: 5, lineCount: 6, mockCount: 0, name: 'b', score: 8, setupLineCount: 3, startLine: 6 },
      { assertionCount: 0, blockPath: ['suite', 'nested'], branchCount: 2, describeDepth: 2, duplicateSetupGroupSize: 0, endLine: 15, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 8, mockCount: 1, name: 'c', score: 11, setupLineCount: 0, startLine: 11, tempResourceCount: 2 },
      { assertionCount: 1, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 20, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 4, mockCount: 0, name: 'd', score: 5, setupLineCount: 0, startLine: 16 },
      { assertionCount: 3, blockPath: ['suite', 'nested'], branchCount: 1, describeDepth: 1, duplicateSetupGroupSize: 2, endLine: 25, helperCallCount: 1, helperHiddenLineCount: 9, lineCount: 5, mockCount: 0, name: 'e', score: 6, setupLineCount: 4, startLine: 21, tableDriven: true },
      { assertionCount: 2, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 30, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 3, mockCount: 0, name: 'f', score: 4, setupLineCount: 0, startLine: 26 }
    ];

    const { analyzeScrapFile } = await import('../../src/scrap/metrics');
    const result = analyzeScrapFile(sourceFile());

    expect(result.averageScore).toBe(6);
    expect(result.branchingExampleCount).toBe(3);
    expect(result.duplicateSetupExampleCount).toBe(2);
    expect(result.helperHiddenExampleCount).toBe(2);
    expect(result.lowAssertionExampleCount).toBe(3);
    expect(result.tableDrivenExampleCount).toBe(1);
    expect(result.tempResourceExampleCount).toBe(1);
    expect(result.zeroAssertionExampleCount).toBe(1);
    expect(result.maxScore).toBe(11);
    expect(result.remediationMode).toBe('LOCAL');
    expect(result.blockSummaries.map((block) => ({
      maxScore: block.maxScore,
      name: block.name,
      path: block.path,
      remediationMode: block.remediationMode
    }))).toEqual([
      { maxScore: 11, name: 'nested', path: ['suite', 'nested'], remediationMode: 'LOCAL' },
      { maxScore: 11, name: 'suite', path: ['suite'], remediationMode: 'LOCAL' }
    ]);
    expect(result.worstExamples.map((example) => example.name)).toEqual(['c', 'b', 'e', 'd', 'f']);
  });

  it('treats exact threshold values as hot and low-assertion', async () => {
    metrics = [
      { assertionCount: 1, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 5, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 3, mockCount: 0, name: 'a', score: 8, setupLineCount: 0, startLine: 1 },
      { assertionCount: 1, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 10, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 3, mockCount: 0, name: 'b', score: 8, setupLineCount: 0, startLine: 6 },
      { assertionCount: 2, blockPath: ['suite'], branchCount: 0, describeDepth: 1, duplicateSetupGroupSize: 0, endLine: 15, helperCallCount: 0, helperHiddenLineCount: 0, lineCount: 3, mockCount: 0, name: 'c', score: 8, setupLineCount: 0, startLine: 11 }
    ];

    const { analyzeScrapFile } = await import('../../src/scrap/metrics');
    const result = analyzeScrapFile(sourceFile());

    expect(result.lowAssertionExampleCount).toBe(2);
    expect(result.remediationMode).toBe('SPLIT');
  });
});

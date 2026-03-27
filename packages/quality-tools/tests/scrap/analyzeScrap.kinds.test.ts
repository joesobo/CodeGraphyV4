import * as ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityTarget } from '../../src/shared/resolveTarget';

const files = ['/repo/a.test.ts', '/repo/b.test.tsx'];
const analyzeCalls: ts.SourceFile[] = [];

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => `
    test('works', () => {
      expect(true).toBe(true);
    });
  `)
}));

vi.mock('../../src/scrap/testFiles', () => ({
  discoverTestFiles: vi.fn(() => files)
}));

vi.mock('../../src/scrap/metrics', () => ({
  analyzeScrapFile: vi.fn((sourceFile: ts.SourceFile) => {
    analyzeCalls.push(sourceFile);
    return {
      averageScore: sourceFile.languageVariant,
      branchingExampleCount: 0,
      blockSummaries: [],
      duplicateSetupExampleCount: 0,
      exampleCount: 1,
      filePath: sourceFile.fileName,
      helperHiddenExampleCount: 0,
      lowAssertionExampleCount: 0,
      maxScore: sourceFile.languageVariant,
      remediationMode: 'STABLE' as const,
      worstExamples: [],
      zeroAssertionExampleCount: 0
    };
  })
}));

const target: QualityTarget = {
  absolutePath: '/repo/packages/example/tests',
  kind: 'directory',
  packageName: 'example',
  packageRelativePath: 'tests',
  packageRoot: '/repo/packages/example',
  relativePath: 'packages/example/tests'
};

describe('analyzeScrap script kinds', () => {
  beforeEach(() => {
    analyzeCalls.length = 0;
    vi.resetModules();
  });

  it('uses TS for .ts files and TSX for .tsx files', async () => {
    const { analyzeScrap } = await import('../../src/scrap/analyzeScrap');
    const metrics = analyzeScrap(target);

    expect(metrics.map((metric) => metric.filePath)).toEqual(files);
    expect(analyzeCalls.map((sourceFile) => sourceFile.languageVariant)).toEqual([
      ts.LanguageVariant.Standard,
      ts.LanguageVariant.JSX
    ]);
  });
});

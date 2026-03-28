import { vi } from 'vitest';
import { REPO_ROOT } from '../../../../src/shared/resolve/repoRoot';
import type { QualityTarget } from '../../../../src/shared/resolve/target';
import type { ScrapFileMetric } from '../../../../src/scrap/analysis/metrics';
import type { ScrapCliDependencies } from '../../../../src/scrap/command';

export function qualityToolsTarget(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools/tests`,
    kind: 'directory',
    packageName: 'quality-tools',
    packageRelativePath: 'tests',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools/tests'
  };
}

export function repoTarget(): QualityTarget {
  return {
    absolutePath: REPO_ROOT,
    kind: 'repo',
    relativePath: '.'
  };
}

export function createMetrics(): ScrapFileMetric[] {
  return [
    {
      averageScore: 1.5,
      branchingExampleCount: 0,
      blockSummaries: [],
      duplicateSetupExampleCount: 0,
      exampleCount: 1,
      filePath: `${REPO_ROOT}/packages/quality-tools/tests/scrap/metrics.basics.test.ts`,
      helperHiddenExampleCount: 0,
      lowAssertionExampleCount: 0,
      maxScore: 2,
      remediationMode: 'STABLE',
      worstExamples: [],
      zeroAssertionExampleCount: 0
    }
  ];
}

export function createDependencies(overrides: Partial<ScrapCliDependencies> = {}): ScrapCliDependencies {
  return {
    analyzeScrap: vi.fn(() => createMetrics()),
    reportScrap: vi.fn(),
    resolveQualityTarget: vi.fn(() => qualityToolsTarget()),
    setExitCode: vi.fn(),
    ...overrides
  };
}

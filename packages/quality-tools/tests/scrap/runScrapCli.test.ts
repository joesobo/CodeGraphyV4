import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { runScrapCli, type ScrapCliDependencies } from '../../src/scrap/runScrapCli';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import type { QualityTarget } from '../../src/shared/resolveTarget';
import type { ScrapFileMetric } from '../../src/scrap/metrics';

const {
  applyBaselineComparison,
  mkdirSync,
  writeFileSync
} = vi.hoisted(() => ({
  applyBaselineComparison: vi.fn((metrics: ScrapFileMetric[]) => metrics),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

vi.mock('fs', () => ({
  mkdirSync,
  writeFileSync
}));

vi.mock('../../src/scrap/baselineCompare', () => ({
  applyBaselineComparison
}));

function target(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools/tests`,
    kind: 'directory',
    packageName: 'quality-tools',
    packageRelativePath: 'tests',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools/tests'
  };
}

function createMetrics(): ScrapFileMetric[] {
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

function createDependencies(): ScrapCliDependencies {
  return {
    analyzeScrap: vi.fn(() => createMetrics()),
    reportScrap: vi.fn(),
    resolveQualityTarget: vi.fn(() => target())
  };
}

function repoTarget(): QualityTarget {
  return {
    absolutePath: REPO_ROOT,
    kind: 'repo',
    relativePath: '.'
  };
}

describe('runScrapCli', () => {
  it('prints json output when requested', () => {
    const dependencies = createDependencies();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runScrapCli(['--json', 'quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.analyzeScrap).toHaveBeenCalled();
    expect(dependencies.reportScrap).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('reports human-readable output by default', () => {
    applyBaselineComparison.mockClear();
    mkdirSync.mockClear();
    writeFileSync.mockClear();

    const dependencies = createDependencies();
    runScrapCli(['quality-tools/'], dependencies);

    expect(applyBaselineComparison).not.toHaveBeenCalled();
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(dependencies.reportScrap).toHaveBeenCalledWith(createMetrics(), REPO_ROOT, {
      verbose: false
    });
  });

  it('writes a baseline and applies comparison when requested', () => {
    mkdirSync.mockClear();
    writeFileSync.mockClear();
    applyBaselineComparison.mockClear();

    const dependencies = createDependencies();
    runScrapCli(['--write-baseline', '--compare', '/tmp/scrap-baseline.json', '--verbose', 'quality-tools/'], dependencies);

    const baselinePath = join(REPO_ROOT, 'reports', 'scrap', 'packages-quality-tools-tests.json');
    expect(applyBaselineComparison).toHaveBeenCalledWith(createMetrics(), '/tmp/scrap-baseline.json');
    expect(mkdirSync).toHaveBeenCalledWith(join(baselinePath, '..'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      baselinePath,
      JSON.stringify(createMetrics(), null, 2)
    );
    expect(dependencies.reportScrap).toHaveBeenCalledWith(createMetrics(), REPO_ROOT, {
      verbose: true
    });
  });

  it('uses the repo report key when writing a baseline for the repo target', () => {
    mkdirSync.mockClear();
    writeFileSync.mockClear();

    const dependencies = createDependencies();
    vi.mocked(dependencies.resolveQualityTarget).mockReturnValue(repoTarget());
    runScrapCli(['--write-baseline'], dependencies);

    const baselinePath = join(REPO_ROOT, 'reports', 'scrap', 'repo.json');
    expect(mkdirSync).toHaveBeenCalledWith(join(baselinePath, '..'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      baselinePath,
      JSON.stringify(createMetrics(), null, 2)
    );
  });
});

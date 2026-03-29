import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { runScrapCli } from '../../../../src/scrap/command';
import { REPO_ROOT } from '../../../../src/shared/resolve/repoRoot';
import type { ScrapFileMetric } from '../../../../src/scrap/analysis/metrics';
import { createDependencies, createMetrics, repoTarget } from '../../test/run/support';
import { baselinePathFor } from '../../../../src/scrap/baseline';

const {
  applyBaselineComparison,
  mkdirSync,
  readFileSync,
  writeFileSync
} = vi.hoisted(() => ({
  applyBaselineComparison: vi.fn((metrics: ScrapFileMetric[]) => metrics),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => '[]'),
  writeFileSync: vi.fn()
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    mkdirSync,
    readFileSync,
    writeFileSync
  };
});

vi.mock('../../../../src/scrap/test/compare', () => ({
  applyBaselineComparison
}));

describe('command baseline handling', () => {
  it('writes a baseline and applies comparison when requested', () => {
    mkdirSync.mockClear();
    writeFileSync.mockClear();
    applyBaselineComparison.mockClear();

    const dependencies = createDependencies();
    runScrapCli(['--write-baseline', '--compare', '/tmp/scrap-baseline.json', '--verbose', 'quality-tools/'], dependencies);

    const baselinePath = baselinePathFor('packages/quality-tools/tests');
    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
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

  it('skips compare and policy flag values before resolving the target', () => {
    const dependencies = createDependencies();

    runScrapCli([
      '--compare',
      '/tmp/scrap-baseline.json',
      '--policy',
      'strict',
      'quality-tools/'
    ], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
  });

  it('uses the repo report key when writing a baseline for the repo target', () => {
    mkdirSync.mockClear();
    writeFileSync.mockClear();

    const dependencies = createDependencies({
      resolveQualityTarget: () => repoTarget()
    });
    runScrapCli(['--write-baseline'], dependencies);

    const baselinePath = baselinePathFor('.');
    expect(mkdirSync).toHaveBeenCalledWith(join(baselinePath, '..'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      baselinePath,
      JSON.stringify(createMetrics(), null, 2)
    );
  });
});

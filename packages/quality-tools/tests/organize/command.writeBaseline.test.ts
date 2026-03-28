import { describe, expect, it, vi } from 'vitest';
import { join } from 'path';
import {
  baselinePathFor,
  runOrganizeCli,
  stripComparisonsForBaseline
} from '../../src/organize/command';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import { createDependencies, createMetrics, qualityToolsTarget } from './command.testSupport';
import type { OrganizeComparison } from '../../src/organize/types';

describe('organize command baseline helpers', () => {
  it('uses repo.json for the repo target baseline path', () => {
    expect(baselinePathFor('.')).toBe(join(REPO_ROOT, 'reports', 'organize', 'repo.json'));
  });

  it('uses the sanitized target path for package baselines', () => {
    expect(baselinePathFor('packages/quality-tools')).toBe(
      join(REPO_ROOT, 'reports', 'organize', 'packages-quality-tools.json')
    );
  });

  it('strips comparison data before baseline write', () => {
    const comparison: OrganizeComparison = {
      clusterCountDelta: 0,
      fileFanOutDelta: 0,
      folderFanOutDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: 0,
      verdict: 'worse'
    };
    const metrics = [
      {
        ...createMetrics()[0],
        comparison
      }
    ];

    expect(stripComparisonsForBaseline(metrics)).toEqual([
      createMetrics()[0]
    ]);
  });
});

describe('runOrganizeCli write-baseline behavior', () => {
  it('writes the repo baseline to reports/organize/repo.json when the flag is present', () => {
    const mkdirSync = vi.fn();
    const writeFileSync = vi.fn();
    const comparison: OrganizeComparison = {
      clusterCountDelta: 0,
      fileFanOutDelta: 0,
      folderFanOutDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: 0,
      verdict: 'worse'
    };
    const metrics = [
      {
        ...createMetrics()[0],
        comparison
      }
    ];

    const dependencies = createDependencies({
      analyze: vi.fn(() => metrics),
      mkdirSync,
      reportOrganize: vi.fn(),
      resolveQualityTarget: vi.fn(() => ({
        absolutePath: REPO_ROOT,
        kind: 'repo' as const,
        relativePath: '.'
      })),
      writeFileSync
    });

    runOrganizeCli(['--write-baseline', '.'], dependencies);

    expect(mkdirSync).toHaveBeenCalledWith(
      join(REPO_ROOT, 'reports', 'organize'),
      { recursive: true }
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      join(REPO_ROOT, 'reports', 'organize', 'repo.json'),
      JSON.stringify([createMetrics()[0]], null, 2)
    );
    expect(dependencies.reportOrganize).toHaveBeenCalledWith(metrics, { verbose: false });
  });

  it('does not write a baseline when the flag is absent', () => {
    const mkdirSync = vi.fn();
    const writeFileSync = vi.fn();
    const reportOrganize = vi.fn();
    const dependencies = createDependencies({
      mkdirSync,
      reportOrganize,
      resolveQualityTarget: vi.fn(() => qualityToolsTarget()),
      writeFileSync
    });

    runOrganizeCli(['packages/quality-tools'], dependencies);

    expect(mkdirSync).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(reportOrganize).toHaveBeenCalled();
  });
});

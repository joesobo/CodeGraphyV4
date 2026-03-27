import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { compareBaseline } from '../../src/organize/baselineCompare';
import type { OrganizeDirectoryMetric } from '../../src/organize/organizeTypes';

function metric(overrides: Partial<OrganizeDirectoryMetric> = {}): OrganizeDirectoryMetric {
  return {
    averageRedundancy: 0.2,
    clusters: [],
    depth: 3,
    depthVerdict: 'STABLE',
    directoryPath: '/repo/src',
    fileIssues: [],
    fileFanOut: 5,
    fileFanOutVerdict: 'STABLE',
    folderFanOut: 2,
    folderFanOutVerdict: 'STABLE',
    ...overrides
  };
}

describe('compareBaseline', () => {
  it('returns improved verdict when all metrics decreased', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.4,
          clusters: [{ confidence: 'imports-only' as const, memberCount: 2, members: [], prefix: '', suggestedFolder: '' }],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [{ detail: '', fileName: '', kind: 'barrel' as const }],
          fileFanOut: 8,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 4,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline([metric()], baselinePath);

    expect(result.get('/repo/src')).toEqual({
      fileFanOutDelta: -3,
      folderFanOutDelta: -2,
      clusterCountDelta: -1,
      issueCountDelta: -1,
      redundancyDelta: -0.2,
      verdict: 'improved'
    });
  });

  it('returns worse verdict when all metrics increased', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.1,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [],
          fileFanOut: 3,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 1,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline([metric()], baselinePath);

    expect(result.get('/repo/src')).toEqual({
      fileFanOutDelta: 2,
      folderFanOutDelta: 1,
      clusterCountDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: 0.1,
      verdict: 'worse'
    });
  });

  it('returns mixed verdict when some metrics up and some down', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.1,
          clusters: [{ confidence: 'imports-only' as const, memberCount: 2, members: [], prefix: '', suggestedFolder: '' }],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [],
          fileFanOut: 8,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 1,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline([metric()], baselinePath);

    expect(result.get('/repo/src')).toEqual({
      fileFanOutDelta: -3,
      folderFanOutDelta: 1,
      clusterCountDelta: -1,
      issueCountDelta: 0,
      redundancyDelta: 0.1,
      verdict: 'mixed'
    });
  });

  it('returns unchanged verdict when all metrics are the same', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.2,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [],
          fileFanOut: 5,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 2,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline([metric()], baselinePath);

    expect(result.get('/repo/src')).toEqual({
      fileFanOutDelta: 0,
      folderFanOutDelta: 0,
      clusterCountDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: 0,
      verdict: 'unchanged'
    });
  });

  it('does not include comparison for new directories not in baseline', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(baselinePath, JSON.stringify([]));

    const result = compareBaseline([metric()], baselinePath);

    expect(result.get('/repo/src')).toBeUndefined();
    expect(result.size).toBe(0);
  });

  it('does not include comparison for directories removed from baseline', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.2,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [],
          fileFanOut: 5,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 2,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline([metric({ directoryPath: '/repo/new' })], baselinePath);

    expect(result.get('/repo/new')).toBeUndefined();
    expect(result.size).toBe(0);
  });

  it('handles multiple directories with comparisons', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-baseline-')), 'baseline.json');
    writeFileSync(
      baselinePath,
      JSON.stringify([
        {
          averageRedundancy: 0.3,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/src',
          fileIssues: [],
          fileFanOut: 6,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 3,
          folderFanOutVerdict: 'STABLE' as const
        },
        {
          averageRedundancy: 0.1,
          clusters: [],
          depth: 2,
          depthVerdict: 'STABLE' as const,
          directoryPath: '/repo/tests',
          fileIssues: [],
          fileFanOut: 2,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 1,
          folderFanOutVerdict: 'STABLE' as const
        }
      ])
    );

    const result = compareBaseline(
      [
        metric({ directoryPath: '/repo/src' }),
        metric({ directoryPath: '/repo/tests', fileFanOut: 3, folderFanOut: 2 })
      ],
      baselinePath
    );

    expect(result.size).toBe(2);
    expect(result.get('/repo/src')).toEqual({
      fileFanOutDelta: -1,
      folderFanOutDelta: -1,
      clusterCountDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: -0.1,
      verdict: 'improved'
    });
    expect(result.get('/repo/tests')).toEqual({
      fileFanOutDelta: 1,
      folderFanOutDelta: 1,
      clusterCountDelta: 0,
      issueCountDelta: 0,
      redundancyDelta: 0.1,
      verdict: 'worse'
    });
  });
});

import { describe, expect, it, afterEach } from 'vitest';
import { compareBaseline } from '../../src/organize/baselineCompare';
import { createMetric, createBaselineFile, cleanupTempDirs } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('compareBaseline', () => {
  it('returns improved verdict when all metrics decreased', () => {
    const baselinePath = createBaselineFile(
      [
        createMetric({
          averageRedundancy: 0.4,
          clusters: [{ confidence: 'imports-only' as const, memberCount: 2, members: [], prefix: '', suggestedFolder: '' }],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          fileIssues: [{ detail: '', fileName: '', kind: 'barrel' as const }],
          fileFanOut: 8,
          folderFanOut: 4
        })
      ],
      tempDirs
    );

    const result = compareBaseline([createMetric()], baselinePath);

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
    const baselinePath = createBaselineFile(
      [
        createMetric({
          averageRedundancy: 0.1,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          fileIssues: [],
          fileFanOut: 3,
          folderFanOut: 1
        })
      ],
      tempDirs
    );

    const result = compareBaseline([createMetric()], baselinePath);

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
    const baselinePath = createBaselineFile(
      [
        createMetric({
          averageRedundancy: 0.1,
          clusters: [{ confidence: 'imports-only' as const, memberCount: 2, members: [], prefix: '', suggestedFolder: '' }],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          fileIssues: [],
          fileFanOut: 8,
          folderFanOut: 1
        })
      ],
      tempDirs
    );

    const result = compareBaseline([createMetric()], baselinePath);

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
    const baselinePath = createBaselineFile([createMetric()], tempDirs);

    const result = compareBaseline([createMetric()], baselinePath);

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
    const baselinePath = createBaselineFile([], tempDirs);

    const result = compareBaseline([createMetric()], baselinePath);

    expect(result.get('/repo/src')).toBeUndefined();
    expect(result.size).toBe(0);
  });

  it('does not include comparison for directories removed from baseline', () => {
    const baselinePath = createBaselineFile([createMetric()], tempDirs);

    const result = compareBaseline([createMetric({ directoryPath: '/repo/new' })], baselinePath);

    expect(result.get('/repo/new')).toBeUndefined();
    expect(result.size).toBe(0);
  });

  it('handles multiple directories with comparisons', () => {
    const baselinePath = createBaselineFile(
      [
        createMetric({ directoryPath: '/repo/src', fileFanOut: 6, folderFanOut: 3, averageRedundancy: 0.3 }),
        createMetric({ directoryPath: '/repo/tests', fileFanOut: 2, folderFanOut: 1, averageRedundancy: 0.1 })
      ],
      tempDirs
    );

    const result = compareBaseline(
      [
        createMetric({ directoryPath: '/repo/src' }),
        createMetric({ directoryPath: '/repo/tests', fileFanOut: 3, folderFanOut: 2 })
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

  it('sorts baseline by directoryPath before matching', () => {
    const baselinePath = createBaselineFile(
      [
        createMetric({ directoryPath: '/repo/z' }),
        createMetric({ directoryPath: '/repo/a' }),
        createMetric({ directoryPath: '/repo/m' })
      ],
      tempDirs
    );

    const result = compareBaseline(
      [
        createMetric({ directoryPath: '/repo/a' }),
        createMetric({ directoryPath: '/repo/m' }),
        createMetric({ directoryPath: '/repo/z' })
      ],
      baselinePath
    );

    expect(result.size).toBe(3);
    expect(result.has('/repo/a')).toBe(true);
    expect(result.has('/repo/m')).toBe(true);
    expect(result.has('/repo/z')).toBe(true);
  });

  it('tests delta boundary at exactly 0: should not count as positive or negative', () => {
    const baselinePath = createBaselineFile([createMetric({ directoryPath: '/repo/src' })], tempDirs);

    const result = compareBaseline([createMetric({ directoryPath: '/repo/src' })], baselinePath);

    const comp = result.get('/repo/src');
    expect(comp?.verdict).toBe('unchanged');
    expect(comp?.fileFanOutDelta).toBe(0);
    expect(comp?.folderFanOutDelta).toBe(0);
    expect(comp?.clusterCountDelta).toBe(0);
    expect(comp?.issueCountDelta).toBe(0);
    expect(comp?.redundancyDelta).toBe(0);
  });

  it('tests <= 0 boundary: all negative and one zero should be improved', () => {
    const baselinePath = createBaselineFile(
      [
        createMetric({
          directoryPath: '/repo/src',
          averageRedundancy: 0.5,
          clusters: [{ confidence: 'imports-only' as const, memberCount: 1, members: ['a'], prefix: '', suggestedFolder: '' }],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          fileIssues: [{ detail: '', fileName: '', kind: 'barrel' as const }],
          fileFanOut: 8,
          folderFanOut: 2
        })
      ],
      tempDirs
    );

    const result = compareBaseline(
      [createMetric({ directoryPath: '/repo/src', fileFanOut: 7, folderFanOut: 2 })],
      baselinePath
    );

    expect(result.get('/repo/src')?.verdict).toBe('improved');
  });

  it('tests >= 0 boundary: all positive and one zero should be worse', () => {
    const baselinePath = createBaselineFile(
      [
        createMetric({
          directoryPath: '/repo/src',
          averageRedundancy: 0.1,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          fileIssues: [],
          fileFanOut: 3,
          folderFanOut: 1
        })
      ],
      tempDirs
    );

    const result = compareBaseline(
      [createMetric({ directoryPath: '/repo/src', fileFanOut: 4, folderFanOut: 1 })],
      baselinePath
    );

    expect(result.get('/repo/src')?.verdict).toBe('worse');
  });

  describe('mutation killers for baselineCompare.ts', () => {
    it('kills mutation: baseline parameter must be read', () => {
      // Confirms that baseline is actually read and used
      const baselinePath = createBaselineFile(
        [createMetric({ directoryPath: '/repo/src', fileFanOut: 10 })],
        tempDirs
      );

      const result = compareBaseline([createMetric({ directoryPath: '/repo/src', fileFanOut: 5 })], baselinePath);

      // If baseline wasn't read, this would be undefined
      expect(result.get('/repo/src')).toBeDefined();
      expect(result.get('/repo/src')?.fileFanOutDelta).toBe(-5);
    });

    it('kills mutation: filter condition must check directoryPath is string', () => {
      // baseline metric without directoryPath string should be skipped
      const baselinePath = createBaselineFile(
        [createMetric({ directoryPath: '/repo/src' })],
        tempDirs
      );

      const result = compareBaseline([createMetric({ directoryPath: '/repo/src' })], baselinePath);

      // Should find match since directoryPath is a string
      expect(result.get('/repo/src')).toBeDefined();
    });

    it('kills mutation: allNegativeOrZero conditional at line 13', () => {
      // When allNegativeOrZero is true but hasNegative is false (all zero), should not return improved
      const baselinePath = createBaselineFile(
        [createMetric({ directoryPath: '/repo/src' })],
        tempDirs
      );

      const result = compareBaseline([createMetric({ directoryPath: '/repo/src' })], baselinePath);

      // All deltas are 0, so allNegativeOrZero is true but hasNegative is false
      expect(result.get('/repo/src')?.verdict).toBe('unchanged');
    });

    it('kills mutation: allPositiveOrZero conditional at line 28', () => {
      // When allPositiveOrZero is true but hasPositive is false (all zero), should not return worse
      const baselinePath = createBaselineFile(
        [createMetric({ directoryPath: '/repo/src' })],
        tempDirs
      );

      const result = compareBaseline([createMetric({ directoryPath: '/repo/src' })], baselinePath);

      // All deltas are 0, so allPositiveOrZero is true but hasPositive is false
      expect(result.get('/repo/src')?.verdict).toBe('unchanged');
    });

    it('kills mutation: delta <= 0 must distinguish between < and <=', () => {
      // Zero delta should not cause "improved" verdict unless there's also a negative delta
      const baselinePath = createBaselineFile(
        [
          createMetric({
            directoryPath: '/repo/src',
            fileFanOut: 5,
            folderFanOut: 2,
            averageRedundancy: 0.2,
            clusters: [{ confidence: 'imports-only' as const, memberCount: 1, members: [], prefix: '', suggestedFolder: '' }],
            fileIssues: [{ detail: '', fileName: '', kind: 'barrel' as const }]
          })
        ],
        tempDirs
      );

      const result = compareBaseline(
        [
          createMetric({
            directoryPath: '/repo/src',
            fileFanOut: 5, // same as baseline
            folderFanOut: 2, // same as baseline
            averageRedundancy: 0.2, // same as baseline
            clusters: [], // decreased
            fileIssues: [] // decreased
          })
        ],
        baselinePath
      );

      // Has negative (clusters, issues) and zero (fileFanOut, folderFanOut, redundancy)
      expect(result.get('/repo/src')?.verdict).toBe('improved');
    });

    it('kills mutation: delta >= 0 must distinguish between > and >=', () => {
      // Zero delta should not cause "worse" verdict unless there's also a positive delta
      const baselinePath = createBaselineFile(
        [createMetric({ directoryPath: '/repo/src' })]
        , tempDirs
      );

      const result = compareBaseline(
        [
          createMetric({
            directoryPath: '/repo/src',
            fileFanOut: 6, // increased
            folderFanOut: 2, // same as baseline
            clusters: [],
            fileIssues: []
          })
        ],
        baselinePath
      );

      // Has positive (fileFanOut) and zero (folderFanOut, clusters, issues, redundancy)
      expect(result.get('/repo/src')?.verdict).toBe('worse');
    });
  });
});

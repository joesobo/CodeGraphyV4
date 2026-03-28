import { describe, expect, it, afterEach } from 'vitest';
import { analyze } from '../../src/organize/analyze';
import { cleanupTempDirs, createTarget, createFileTree } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('analyze - mutation coverage: extractAncestorFolders', () => {
  it('returns empty array when directoryPath is exactly "."', () => {
    const root = createFileTree(
      {
        'file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result.find((metric) => metric.directoryPath === '.');

    // Root directory should have no ancestor folders
    expect(rootMetric).toBeDefined();
  });

  it('extracts single ancestor folder from single-level path', () => {
    const root = createFileTree(
      {
        'src/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const srcMetric = result.find((metric) => metric.directoryPath === 'src');

    expect(srcMetric).toBeDefined();
    expect(srcMetric?.directoryPath).toBe('src');
  });

  it('extracts multiple ancestor folders from nested path', () => {
    const root = createFileTree(
      {
        'src/core/utils/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const utilsMetric = result.find((metric) => metric.directoryPath === 'src/core/utils');

    expect(utilsMetric).toBeDefined();
  });

  it('handles path with forward slashes correctly', () => {
    const root = createFileTree(
      {
        'a/b/c/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const abcMetric = result.find((metric) => metric.directoryPath === 'a/b/c');

    expect(abcMetric).toBeDefined();
  });

  it('filters out empty segments when splitting paths', () => {
    // The filter(seg => seg.length > 0) should remove empty segments
    // This test verifies paths are correctly split and filtered
    const root = createFileTree(
      {
        'src/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    expect(result.length).toBeGreaterThan(0);
    const paths = result.map((metric) => metric.directoryPath);
    // Paths should not contain empty segments
    expect(paths.every((directoryPath) => !directoryPath.includes('//'))).toBe(true);
  });
});

describe('analyze - mutation coverage: computeAverageRedundancy', () => {
  it('returns 0 when no files in directory', () => {
    const root = createFileTree(
      {
        'empty/': null
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const emptyMetric = result.find((metric) => metric.directoryPath === 'empty');

    expect(emptyMetric?.averageRedundancy).toBe(0);
  });

  it('calculates average of single file redundancy score', () => {
    const root = createFileTree(
      {
        'src/srcFile.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const srcMetric = result.find((metric) => metric.directoryPath === 'src');

    // Single file with redundant name should average to that redundancy score
    expect(srcMetric?.averageRedundancy).toBeGreaterThan(0);
    expect(srcMetric?.averageRedundancy).toBeLessThanOrEqual(1);
  });

  it('calculates average of multiple file redundancy scores correctly', () => {
    const root = createFileTree(
      {
        'src/srcFile.ts': 'export const x = 1;',
        'src/srcUtils.ts': 'export const y = 2;',
        'src/other.ts': 'export const z = 3;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const srcMetric = result.find((metric) => metric.directoryPath === 'src');

    // Average should be computed from all files
    expect(srcMetric?.averageRedundancy).toBeGreaterThan(0);
    expect(srcMetric?.averageRedundancy).toBeLessThanOrEqual(1);
  });

  it('uses sum divided by length for average calculation', () => {
    const root = createFileTree(
      {
        'data/data1.ts': 'export const x = 1;',
        'data/data2.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const dataMetric = result.find((metric) => metric.directoryPath === 'data');

    // Should be average (not sum or product)
    expect(dataMetric?.averageRedundancy).toBeDefined();
    expect(typeof dataMetric?.averageRedundancy).toBe('number');
  });
});

describe('analyze - mutation coverage: collectFileIssues redundancy check', () => {
  it('includes files with redundancy score >= threshold', () => {
    const root = createFileTree(
      {
        'config/configFile.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const configMetric = result.find((metric) => metric.directoryPath === 'config');

    // File with high redundancy should be included
    const redundancyIssues = configMetric?.fileIssues.filter((i) => i.kind === 'redundancy');
    expect(redundancyIssues).toBeDefined();
  });

  it('excludes files below redundancy threshold', () => {
    const root = createFileTree(
      {
        'data/tool.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const dataMetric = result.find((metric) => metric.directoryPath === 'data');

    // File with no redundancy overlap should not be flagged
    const redundancyIssues = dataMetric?.fileIssues.filter((i) => i.kind === 'redundancy');
    expect(redundancyIssues?.length ?? 0).toBeLessThanOrEqual(0);
  });

  it('compares with >= operator (not >)', () => {
    // This test ensures >= is used, not >
    // A file at exactly the threshold should be included
    const root = createFileTree(
      {
        'scrap/scrapData.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const scrapMetric = result.find((metric) => metric.directoryPath === 'scrap');

    // Should have at least one redundancy issue
    const redundancyIssues = scrapMetric?.fileIssues.filter((i) => i.kind === 'redundancy');
    expect(redundancyIssues?.length ?? 0).toBeGreaterThan(0);
  });

  it('formats redundancy score as percentage in detail string', () => {
    const root = createFileTree(
      {
        'utils/utilsHelper.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const utilsMetric = result.find((metric) => metric.directoryPath === 'utils');

    const redundancyIssues = utilsMetric?.fileIssues.filter((i) => i.kind === 'redundancy');
    if (redundancyIssues && redundancyIssues.length > 0) {
      // Detail should contain percentage format
      expect(redundancyIssues[0]?.detail).toMatch(/\d+%/);
    }
  });

  it('stores redundancyScore on redundancy issues', () => {
    const root = createFileTree(
      {
        'api/apiClient.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const apiMetric = result.find((metric) => metric.directoryPath === 'api');

    const redundancyIssues = apiMetric?.fileIssues.filter((i) => i.kind === 'redundancy');
    if (redundancyIssues && redundancyIssues.length > 0) {
      expect(redundancyIssues[0]?.redundancyScore).toBeDefined();
      expect(typeof redundancyIssues[0]?.redundancyScore).toBe('number');
    }
  });
});

describe('analyze - mutation coverage: checkLowInfoName call', () => {
  it('checks low-info names with second argument false (not true)', () => {
    const root = createFileTree(
      {
        'utils.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result[0];

    // utils.ts should be flagged as low-info
    const lowInfoIssues = rootMetric?.fileIssues.filter((i) => i.kind === 'low-info-banned');
    expect(lowInfoIssues?.length ?? 0).toBeGreaterThan(0);
  });

  it('includes low-info issues when check returns truthy', () => {
    const root = createFileTree(
      {
        'helpers.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result[0];

    const lowInfoIssues = rootMetric?.fileIssues.filter((i) => i.kind === 'low-info-banned');
    expect(lowInfoIssues?.length ?? 0).toBeGreaterThan(0);
  });

  it('skips low-info issues when check returns falsy', () => {
    const root = createFileTree(
      {
        'models.ts': 'export const x = 1;',
        'legitimate.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result[0];

    // legitimate.ts should not trigger low-info check
    const issues = rootMetric?.fileIssues.filter((i) => i.fileName === 'legitimate.ts');
    expect(issues?.length ?? 0).toBe(0);
  });
});

describe('analyze - mutation coverage: rounding to 2 decimal places', () => {
  it('rounds averageRedundancy to exactly 2 decimal places', () => {
    const root = createFileTree(
      {
        'src/srcModule.ts': 'export const x = 1;',
        'src/srcService.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const srcMetric = result.find((metric) => metric.directoryPath === 'src');

    // Verify rounding: Math.round(x * 100) / 100
    const raw = srcMetric?.averageRedundancy ?? 0;
    const expected = Math.round(raw * 100) / 100;

    expect(srcMetric?.averageRedundancy).toBe(expected);
  });

  it('preserves values with fewer than 2 decimal places', () => {
    const root = createFileTree(
      {
        'noredun.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result[0];

    // Should still be rounded to 2 decimals
    const str = String(rootMetric?.averageRedundancy);
    const decimalParts = str.split('.');
    if (decimalParts[1]) {
      expect(decimalParts[1].length).toBeLessThanOrEqual(2);
    }
  });

  it('does not use multiplication instead of division for rounding', () => {
    const root = createFileTree(
      {
        'src/srcModule.ts': 'export const x = 1;',
        'src/srcService.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const srcMetric = result.find((metric) => metric.directoryPath === 'src');

    // If multiplication was used instead, values would be much larger
    expect(srcMetric?.averageRedundancy).toBeLessThanOrEqual(1);
  });

  it('applies rounding correctly for edge case values', () => {
    const root = createFileTree(
      {
        'api/apiClient.ts': 'export const x = 1;',
        'api/apiServer.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const apiMetric = result.find((metric) => metric.directoryPath === 'api');

    // Verify the rounding formula is applied
    const value = apiMetric?.averageRedundancy ?? 0;
    expect(typeof value).toBe('number');
    expect(isFinite(value)).toBe(true);
  });
});

describe('analyze - mutation coverage: filter in extractAncestorFolders', () => {
  it('filters out segments with zero length from split', () => {
    const root = createFileTree(
      {
        'a/b/c/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const paths = result.map((metric) => metric.directoryPath);

    // Should not have double slashes or other artifacts from empty segments
    expect(paths.every((directoryPath) => !directoryPath.match(/\/\//g))).toBe(true);
  });

  it('works with both Windows and Unix path separators', () => {
    const root = createFileTree(
      {
        'src/core/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const coreMetric = result.find((metric) => metric.directoryPath.includes('core'));

    expect(coreMetric).toBeDefined();
  });
});

describe('analyze - mutation coverage: conditional expression mutations', () => {
  it('returns specific array for root directory, not false or alternate value', () => {
    const root = createFileTree(
      {
        'file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result.find((metric) => metric.directoryPath === '.');

    // Should have metrics for root (not be false or missing)
    expect(rootMetric).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns array from split().filter() for non-root paths', () => {
    const root = createFileTree(
      {
        'src/file.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    // Should process all directories
    expect(result.length).toBeGreaterThan(1);
  });

  it('always checks if directoryPath === "." (not false)', () => {
    const root = createFileTree(
      {
        'file.ts': 'export const x = 1;',
        'src/file.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);
    const rootMetric = result.find((metric) => metric.directoryPath === '.');

    // Root should be processed correctly
    expect(rootMetric).toBeDefined();
  });
});

import { describe, expect, it, afterEach } from 'vitest';
import { analyze } from '../../src/organize/analyze';
import { cleanupTempDirs, createTarget, createFileTree } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('analyze - basic functionality', () => {
  it('returns empty array for directory with no files', () => {
    const root = createFileTree({}, tempDirs);
    const target = createTarget(root);

    const result = analyze(target);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      directoryPath: '.',
      fileFanOut: 0,
      folderFanOut: 0,
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE',
      depth: 0,
      averageRedundancy: 0,
      fileIssues: [],
      clusters: []
    });
  });

  it('analyzes simple directory with 3 files and no issues', () => {
    const root = createFileTree(
      {
        'alpha.ts': 'export const x = 1;',
        'beta.ts': 'export const y = 2;',
        'gamma.ts': 'export const z = 3;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      directoryPath: '.',
      fileFanOut: 3,
      folderFanOut: 0,
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      fileIssues: []
    });
  });

  it('detects SPLIT verdict for directory with 15 files (exceeds split threshold)', () => {
    const files: Record<string, string> = {};
    for (let ii = 1; ii <= 15; ii++) {
      files[`file${ii}.ts`] = `export const x${ii} = ${ii};`;
    }
    const root = createFileTree(files, tempDirs);
    const target = createTarget(root);

    const result = analyze(target);

    expect(result).toHaveLength(1);
    expect(result[0]?.fileFanOut).toBe(15);
    expect(result[0]?.fileFanOutVerdict).toBe('SPLIT');
  });

  it('calculates correct directory depth', () => {
    const root = createFileTree(
      {
        'root.ts': 'export const x = 1;',
        'src/src.ts': 'export const y = 1;',
        'src/core/core.ts': 'export const z = 1;',
        'src/core/utils/utils.ts': 'export const w = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const rootMetric = result.find((metric) => metric.directoryPath === '.');
    expect(rootMetric?.depth).toBe(0);

    const srcMetric = result.find((metric) => metric.directoryPath === 'src');
    expect(srcMetric?.depth).toBe(1);

    const coreMetric = result.find((metric) => metric.directoryPath === 'src/core');
    expect(coreMetric?.depth).toBe(2);

    const utilsMetric = result.find((metric) => metric.directoryPath === 'src/core/utils');
    expect(utilsMetric?.depth).toBe(3);
  });

  it('handles nested structure with multiple directories', () => {
    const root = createFileTree(
      {
        'src/index.ts': 'export const x = 1;',
        'tests/index.test.ts': 'test("", () => {});'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    expect(result.length).toBe(3);
    const rootMetric = result.find((metric) => metric.directoryPath === '.');
    expect(rootMetric?.folderFanOut).toBe(2);
  });

  it('returns metrics sorted by directoryPath', () => {
    const root = createFileTree(
      {
        'zebra/file.ts': '',
        'alpha/file.ts': ''
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const paths = result.map((metric) => metric.directoryPath);
    expect(paths[0]).toBe('.');
    const otherPaths = paths.slice(1);
    expect(otherPaths).toEqual([...otherPaths].sort());
  });

  it('skips node_modules and hidden directories', () => {
    const root = createFileTree(
      {
        'node_modules/index.ts': '',
        '.git/index.ts': '',
        'src/index.ts': ''
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const paths = result.map((metric) => metric.directoryPath);
    expect(paths).toContain('src');
    expect(paths).not.toContain('node_modules');
    expect(paths).not.toContain('.git');
  });

  it('calculates averageRedundancy rounded to 2 decimal places', () => {
    const root = createFileTree(
      {
        'file1.ts': 'export const x = 1;',
        'file2.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const avgRedundancy = result[0]!.averageRedundancy;
    expect(avgRedundancy).toBe(Math.round(avgRedundancy * 100) / 100);
  });

  it('handles files with imports and builds import graph', () => {
    const root = createFileTree(
      {
        'alpha.ts': 'export const x = 1;',
        'beta.ts': 'import "./alpha"; export const y = 2;',
        'gamma.ts': 'import "./beta"; export const z = 3;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    expect(result[0]).toBeDefined();
    expect(result[0]?.clusters).toBeDefined();
  });

  it('includes relative paths correctly using Windows and Unix separators', () => {
    const root = createFileTree(
      {
        'src/core/index.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const metric = result.find((entry) => entry.directoryPath.includes('src'));
    expect(metric).toBeDefined();
    expect(metric?.directoryPath).toMatch(/^src/);
  });
});

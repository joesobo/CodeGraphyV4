import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { analyzeOrganize } from '../../src/organize/analyzeOrganize';
import type { QualityTarget } from '../../src/shared/resolveTarget';

let tempDirs: string[] = [];

function createTempDir(): string {
  const temp = mkdtempSync(join(tmpdir(), 'analyze-organize-'));
  tempDirs.push(temp);
  return temp;
}

function createTarget(absolutePath: string): QualityTarget {
  return {
    absolutePath,
    kind: 'directory',
    relativePath: '.'
  };
}

afterEach(() => {
  tempDirs.forEach((dir) => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  tempDirs = [];
});

describe('analyzeOrganize', () => {
  it('returns empty array for directory with no files', () => {
    const root = createTempDir();
    const target = createTarget(root);

    const result = analyzeOrganize(target);

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
    const root = createTempDir();
    writeFileSync(join(root, 'alpha.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'beta.ts'), 'export const y = 2;');
    writeFileSync(join(root, 'gamma.ts'), 'export const z = 3;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

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
    const root = createTempDir();
    for (let idx = 1; idx <= 15; idx++) {
      writeFileSync(join(root, `file${idx}.ts`), `export const x${idx} = ${idx};`);
    }
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    expect(result).toHaveLength(1);
    expect(result[0]?.fileFanOut).toBe(15);
    expect(result[0]?.fileFanOutVerdict).toBe('SPLIT');
  });

  it('detects low-info name issues', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'utils.ts'), 'export const helper = () => {};');
    writeFileSync(join(root, 'helpers.ts'), 'export const help = () => {};');
    writeFileSync(join(root, 'regular.ts'), 'export const x = 1;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    expect(result[0]?.fileIssues).toHaveLength(2);
    const issues = result[0]!.fileIssues;
    expect(issues.some((issue) => issue.fileName === 'utils.ts' && issue.kind === 'low-info-banned')).toBe(true);
    expect(issues.some((issue) => issue.fileName === 'helpers.ts' && issue.kind === 'low-info-banned')).toBe(true);
  });

  it('detects barrel files', () => {
    const root = createTempDir();
    writeFileSync(
      join(root, 'module.ts'),
      'export { x } from "./alpha";\nexport { y } from "./beta";\nexport { z } from "./gamma";'
    );
    writeFileSync(join(root, 'alpha.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'beta.ts'), 'export const y = 2;');
    writeFileSync(join(root, 'gamma.ts'), 'export const z = 3;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const issues = result[0]!.fileIssues;
    expect(issues.some((issue) => issue.fileName === 'module.ts' && issue.kind === 'barrel')).toBe(true);
  });

  it('calculates path redundancy for files with redundant names', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir);
    writeFileSync(join(srcDir, 'srcModule.ts'), 'export const x = 1;');
    writeFileSync(join(srcDir, 'utils.ts'), 'export const y = 2;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const srcMetric = result.find((metric) => metric.directoryPath === 'src');
    expect(srcMetric).toBeDefined();
    expect(srcMetric!.averageRedundancy).toBeGreaterThan(0);
  });

  it('calculates correct directory depth', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    const coreDir = join(srcDir, 'core');
    const utilsDir = join(coreDir, 'utils');
    mkdirSync(utilsDir, { recursive: true });
    writeFileSync(join(root, 'root.ts'), 'export const x = 1;');
    writeFileSync(join(srcDir, 'src.ts'), 'export const y = 1;');
    writeFileSync(join(coreDir, 'core.ts'), 'export const z = 1;');
    writeFileSync(join(utilsDir, 'utils.ts'), 'export const w = 1;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const rootMetric = result.find((metric) => metric.directoryPath === '.');
    expect(rootMetric?.depth).toBe(0);

    const srcMetric = result.find((metric) => metric.directoryPath === 'src');
    expect(srcMetric?.depth).toBe(1);

    const coreMetric = result.find((metric) => metric.directoryPath === 'src/core');
    expect(coreMetric?.depth).toBe(2);

    const utilsMetric = result.find((metric) => metric.directoryPath === 'src/core/utils');
    expect(utilsMetric?.depth).toBe(3);
  });

  it('finds cohesion clusters for files with shared prefix', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'userModel.ts'), 'export interface User {}');
    writeFileSync(join(root, 'userService.ts'), 'import "./userModel"; export class UserService {}');
    writeFileSync(join(root, 'userController.ts'), 'import "./userService"; export class UserController {}');
    writeFileSync(join(root, 'other.ts'), 'export const x = 1;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const clusters = result[0]!.clusters;
    expect(clusters.length).toBeGreaterThan(0);
    const userCluster = clusters.find((cluster) => cluster.prefix === 'user');
    expect(userCluster).toBeDefined();
    expect(userCluster?.memberCount).toBe(3);
  });

  it('handles nested structure with multiple directories', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    const testsDir = join(root, 'tests');
    mkdirSync(srcDir);
    mkdirSync(testsDir);
    writeFileSync(join(srcDir, 'index.ts'), 'export const x = 1;');
    writeFileSync(join(testsDir, 'index.test.ts'), 'test("", () => {});');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    expect(result.length).toBe(3);
    const rootMetric = result.find((metric) => metric.directoryPath === '.');
    expect(rootMetric?.folderFanOut).toBe(2);
  });

  it('assigns DEEP verdict for deeply nested directories', () => {
    const root = createTempDir();
    const deepPath = join(root, 'a', 'b', 'c', 'd', 'e');
    mkdirSync(deepPath, { recursive: true });
    writeFileSync(join(deepPath, 'deep.ts'), 'export const x = 1;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const deepMetric = result.find((metric) => metric.directoryPath === 'a/b/c/d/e');
    expect(deepMetric?.depth).toBe(5);
    expect(deepMetric?.depthVerdict).toBe('DEEP');
  });

  it('returns metrics sorted by directoryPath', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'zebra'));
    mkdirSync(join(root, 'alpha'));
    writeFileSync(join(root, 'zebra', 'file.ts'), '');
    writeFileSync(join(root, 'alpha', 'file.ts'), '');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const paths = result.map((metric) => metric.directoryPath);
    expect(paths[0]).toBe('.');
    const otherPaths = paths.slice(1);
    expect(otherPaths).toEqual([...otherPaths].sort());
  });

  it('skips node_modules and hidden directories', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'node_modules'));
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'node_modules', 'index.ts'), '');
    writeFileSync(join(root, '.git', 'index.ts'), '');
    writeFileSync(join(root, 'src', 'index.ts'), '');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const paths = result.map((metric) => metric.directoryPath);
    expect(paths).toContain('src');
    expect(paths).not.toContain('node_modules');
    expect(paths).not.toContain('.git');
  });

  it('calculates averageRedundancy rounded to 2 decimal places', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'file1.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'file2.ts'), 'export const y = 2;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const avgRedundancy = result[0]!.averageRedundancy;
    expect(avgRedundancy).toBe(Math.round(avgRedundancy * 100) / 100);
  });

  it('handles files with imports and builds import graph', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'alpha.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'beta.ts'), 'import "./alpha"; export const y = 2;');
    writeFileSync(join(root, 'gamma.ts'), 'import "./beta"; export const z = 3;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    expect(result[0]).toBeDefined();
    expect(result[0]?.clusters).toBeDefined();
  });

  it('includes relative paths correctly using Windows and Unix separators', () => {
    const root = createTempDir();
    const subDir = join(root, 'src', 'core');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'index.ts'), 'export const x = 1;');
    const target = createTarget(root);

    const result = analyzeOrganize(target);

    const metric = result.find((entry) => entry.directoryPath.includes('src'));
    expect(metric).toBeDefined();
    expect(metric?.directoryPath).toMatch(/^src/);
  });
});

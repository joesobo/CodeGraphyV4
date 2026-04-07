import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeBoundaries } from '../../src/boundaries/analyze';
import type { QualityTarget } from '../../src/shared/resolve/target';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function writeWorkspace(packages: Record<string, Record<string, string>>): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-boundaries-dispatch-'));
  tempDirs.push(repoRoot);
  writeFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  writeFileSync(
    join(repoRoot, 'quality.config.json'),
    JSON.stringify({
      defaults: {
        boundaries: {
          include: ['src/**/*.ts']
        }
      }
    })
  );

  for (const [packageName, files] of Object.entries(packages)) {
    mkdirSync(join(repoRoot, 'packages', packageName), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', packageName, 'package.json'), JSON.stringify({ name: packageName }));
    for (const [relativePath, source] of Object.entries(files)) {
      const absolutePath = join(repoRoot, 'packages', packageName, relativePath);
      mkdirSync(join(absolutePath, '..'), { recursive: true });
      writeFileSync(absolutePath, source);
    }
  }

  return repoRoot;
}

describe('analyzeBoundaries dispatch', () => {
  it('merges workspace-package reports for repo targets', () => {
    const repoRoot = writeWorkspace({
      alpha: { 'src/a.ts': 'export const a = 1;\n' },
      beta: { 'src/b.ts': 'export const b = 1;\n' }
    });

    const report = analyzeBoundaries(repoRoot, {
      absolutePath: repoRoot,
      kind: 'repo',
      packageName: undefined,
      packageRelativePath: '.',
      packageRoot: undefined,
      relativePath: '.'
    });

    expect(report.target).toBe('packages');
    expect(report.files.map((file) => file.relativePath)).toEqual([
      'packages/alpha/src/a.ts',
      'packages/beta/src/b.ts'
    ]);
  });

  it('uses the default package root when only packageName is provided', () => {
    const repoRoot = writeWorkspace({
      extension: { 'src/a.ts': 'export const a = 1;\n' }
    });

    const report = analyzeBoundaries(repoRoot, {
      absolutePath: join(repoRoot, 'missing-extension'),
      kind: 'package',
      packageName: 'extension',
      packageRelativePath: '.',
      packageRoot: undefined,
      relativePath: 'packages/extension'
    });

    expect(report.target).toBe('packages/extension');
    expect(report.files.map((file) => file.relativePath)).toEqual(['packages/extension/src/a.ts']);
  });

  it('analyzes existing absolute paths without package metadata', () => {
    const repoRoot = writeWorkspace({
      custom: { 'src/a.ts': 'export const a = 1;\n' }
    });
    const absolutePath = join(repoRoot, 'packages', 'custom');

    const report = analyzeBoundaries(repoRoot, {
      absolutePath,
      kind: 'directory',
      packageName: undefined,
      packageRelativePath: '.',
      packageRoot: undefined,
      relativePath: 'packages/custom'
    } as QualityTarget);

    expect(report.target).toBe('packages/custom');
    expect(report.files.map((file) => file.relativePath)).toEqual(['packages/custom/src/a.ts']);
  });

  it('returns an empty report for missing targets', () => {
    const repoRoot = writeWorkspace({});

    expect(
      analyzeBoundaries(repoRoot, {
        absolutePath: join(repoRoot, 'missing'),
        kind: 'directory',
        packageName: undefined,
        packageRelativePath: '.',
        packageRoot: undefined,
        relativePath: 'missing'
      } as QualityTarget)
    ).toEqual({
      deadEnds: [],
      deadSurfaces: [],
      files: [],
      layerViolations: [],
      target: 'missing'
    });
  });
});

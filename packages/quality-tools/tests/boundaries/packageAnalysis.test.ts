import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzePackage } from '../../src/boundaries/packageAnalysis';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function createWorkspace(): { repoRoot: string; packageRoot: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-package-analysis-'));
  tempDirs.push(repoRoot);
  const packageRoot = join(repoRoot, 'packages', 'example');
  writeFileSync(join(repoRoot, 'quality.config.json'), JSON.stringify({
    defaults: { boundaries: { include: ['src/**/*.ts'] } },
    packages: {
      example: {
        boundaries: {
          layers: [
            { allow: ['shared'], include: ['src/core/**'], name: 'core' },
            { allow: [], include: ['src/shared/**'], name: 'shared' }
          ]
        }
      }
    }
  }));
  for (const [relativePath, source] of Object.entries({
    'src/core/a.ts': "import { shared } from '../shared/shared';\nimport { missing } from './missing';\nexport const a = shared + (missing ?? 0);\n",
    'src/other/free.ts': "import { shared } from '../shared/shared';\nexport const free = shared;\n",
    'src/core/z.ts': 'export const z = 1;\n',
    'src/shared/shared.ts': 'export const shared = 1;\n'
  })) {
    const absolutePath = join(packageRoot, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, source);
  }
  return { packageRoot, repoRoot };
}

describe('analyzePackage', () => {
  it('sorts files, ignores unresolved imports, and computes dead files', () => {
    const { repoRoot, packageRoot } = createWorkspace();

    const report = analyzePackage(repoRoot, { name: 'example', root: packageRoot });

    expect(report.files.map((file) => file.relativePath)).toEqual([
      'packages/example/src/core/a.ts',
      'packages/example/src/core/z.ts',
      'packages/example/src/other/free.ts',
      'packages/example/src/shared/shared.ts'
    ]);
    expect(report.files.find((file) => file.relativePath === 'packages/example/src/shared/shared.ts')).toMatchObject({
      incoming: 2,
      outgoing: 0
    });
    expect(report.deadSurfaces.map((file) => file.relativePath)).toEqual([
      'packages/example/src/core/a.ts',
      'packages/example/src/other/free.ts'
    ]);
    expect(report.deadEnds.map((file) => file.relativePath)).toEqual(['packages/example/src/core/z.ts']);
    expect(report.layerViolations).toEqual([]);
  });
});

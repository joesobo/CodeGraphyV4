import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { analyzeReachability } from '../../src/reachability/analyze';
import type { QualityTarget } from '../../src/shared/resolve/target';

function createTempRepo(): { repoRoot: string; target: QualityTarget } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-reachability-'));
  const packageRoot = join(repoRoot, 'packages', 'extension');

  writeFileSync(
    join(repoRoot, 'quality.config.json'),
    JSON.stringify({
      defaults: {
        boundaries: {
          include: ['src/**/*.ts', 'src/**/*.tsx'],
          exclude: ['src/**/*.d.ts', '**/*.test.ts', '**/*.test.tsx', '**/index.ts', '**/index.tsx']
        }
      },
      packages: {
        extension: {
          boundaries: {
            entrypoints: ['src/extension/activate.ts'],
            layers: [
              {
                allow: ['shared'],
                include: ['src/extension/**'],
                name: 'extension'
              },
              {
                allow: ['shared'],
                include: ['src/shared/**'],
                name: 'shared'
              }
            ]
          }
        }
      }
    }),
  );

  const files: Record<string, string> = {
    'src/extension/activate.ts': "import { shared } from '../shared/used';\nexport const activate = shared;\n",
    'src/shared/isolated.ts': 'export const isolated = 1;\n',
    'src/shared/orphan.ts': "import { shared } from './used';\nexport const relay = shared;\n",
    'src/shared/used.ts': 'export const shared = 1;\n'
  };

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = join(packageRoot, relativePath);
    mkdirSync(join(filePath, '..'), { recursive: true });
    writeFileSync(filePath, source);
  }

  return {
    repoRoot,
    target: {
      absolutePath: packageRoot,
      kind: 'package',
      packageName: 'extension',
      packageRelativePath: '.',
      packageRoot,
      relativePath: 'packages/extension'
    }
  };
}

describe('analyzeReachability', () => {
  it('reports dead surfaces and dead ends for the selected package scope', () => {
    const { repoRoot, target } = createTempRepo();
    const report = analyzeReachability(repoRoot, target);

    expect(report.target).toBe('packages/extension');
    expect(report.deadSurfaces).toEqual([
      expect.objectContaining({
        absolutePath: join(repoRoot, 'packages/extension/src/shared/orphan.ts'),
        incoming: 0,
        outgoing: 1,
        relativePath: 'packages/extension/src/shared/orphan.ts'
      })
    ]);
    expect(report.deadEnds).toEqual([
      expect.objectContaining({
        absolutePath: join(repoRoot, 'packages/extension/src/shared/isolated.ts'),
        incoming: 0,
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts'
      })
    ]);
  });
});

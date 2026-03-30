import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { analyzeBoundaries } from '../../src/boundaries/analyze';
import type { QualityTarget } from '../../src/shared/resolve/target';

function createTempRepo(): { repoRoot: string; target: QualityTarget } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-boundaries-'));
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
            entrypoints: ['src/extension/activate.ts', 'src/webview/main.tsx'],
            layers: [
              {
                allow: ['shared', 'core'],
                include: ['src/extension/**'],
                name: 'extension'
              },
              {
                allow: ['shared', 'extension'],
                include: ['src/core/**'],
                name: 'core'
              },
              {
                allow: ['shared', 'extension', 'core'],
                include: ['src/webview/**'],
                name: 'webview'
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
    })
  );

  const files: Record<string, string> = {
    'src/core/bad.ts': "import { view } from '../webview/view';\nexport const bad = view;\n",
    'src/extension/activate.ts': "import { shared } from '../shared/used';\nexport const activate = shared;\n",
    'src/shared/isolated.ts': 'export const isolated = 1;\n',
    'src/shared/orphan.ts': "import { shared } from './used';\nexport const relay = shared;\n",
    'src/shared/used.ts': 'export const shared = 1;\n',
    'src/webview/main.tsx': "import { view } from './view';\nexport const main = view;\n",
    'src/webview/view.ts': 'export const view = 1;\n'
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

describe('analyzeBoundaries', () => {
  it('finds layer violations and dead surfaces inside a package', () => {
    const { repoRoot, target } = createTempRepo();
    const report = analyzeBoundaries(repoRoot, target);

    expect(report.target).toBe('packages/extension');
    expect(report.layerViolations).toEqual([
      expect.objectContaining({
        from: 'packages/extension/src/core/bad.ts',
        fromLayer: 'core',
        reason: 'core cannot depend on webview',
        to: 'packages/extension/src/webview/view.ts',
        toLayer: 'webview'
      })
    ]);
    expect(report.deadSurfaces).toEqual([
      expect.objectContaining({
        absolutePath: join(repoRoot, 'packages/extension/src/core/bad.ts'),
        incoming: 0,
        outgoing: 1,
        relativePath: 'packages/extension/src/core/bad.ts'
      }),
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
    expect(report.files.some((file) => file.entrypoint)).toBe(true);
    expect(report.files.find((file) => file.relativePath === 'packages/extension/src/extension/activate.ts')!).toMatchObject({
      entrypoint: true,
      incoming: 0,
      outgoing: 1
    });
  });
});

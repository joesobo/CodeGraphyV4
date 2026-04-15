import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { analyzeCrap } from '../../../src/crap/analysis/run';
import type { IstanbulFileCoverage } from '../../../src/crap/coverage/read';

function writeSourceFixture(): { filePath: string; repoRoot: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-crap-'));
  writeFileSync(join(repoRoot, 'quality.config.json'), JSON.stringify({
    defaults: {
      crap: {
        exclude: ['**/e2e/**', '**/tests/**', '**/*.test.ts', '**/*.test.tsx']
      }
    }
  }));
  const sourceDirectory = join(repoRoot, 'packages/example/src');
  mkdirSync(sourceDirectory, { recursive: true });
  const filePath = join(sourceDirectory, 'sample.ts');
  writeFileSync(
    filePath,
    [
      'export function choose(value: number): number {',
      '  if (value > 0) {',
      '    return value;',
      '  }',
      '  return 0;',
      '}'
    ].join('\n')
  );
  return { filePath, repoRoot };
}

function createCoverage(filePath: string): Record<string, IstanbulFileCoverage> {
  return {
    [filePath]: {
      path: filePath,
      s: {
        '0': 1,
        '1': 0
      },
      statementMap: {
        '0': {
          start: { column: 2, line: 2 },
          end: { column: 17, line: 2 }
        },
        '1': {
          start: { column: 2, line: 5 },
          end: { column: 11, line: 5 }
        }
      }
    }
  };
}

describe('analyzeCrap', () => {
  it('reports functions above the threshold for the requested source scope', () => {
    const { filePath, repoRoot } = writeSourceFixture();
    const results = analyzeCrap(
      [createCoverage(filePath)],
      repoRoot,
      'packages/example/src',
      2
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      complexity: 2,
      file: 'packages/example/src/sample.ts',
      name: 'choose'
    });
  });

  it('ignores files outside the selected source scope', () => {
    const { filePath, repoRoot } = writeSourceFixture();
    const results = analyzeCrap(
      [createCoverage(filePath)],
      repoRoot,
      'packages/other/src',
      1
    );

    expect(results).toEqual([]);
  });
});

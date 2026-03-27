import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { analyzeScrap } from '../../src/scrap/analyzeScrap';
import type { QualityTarget } from '../../src/shared/resolveTarget';

function createFixture(
  source: string,
  relativePath = 'packages/example/tests/sample.test.ts'
): { filePath: string; target: QualityTarget } {
  const root = mkdtempSync(join(tmpdir(), 'quality-tools-scrap-'));
  const filePath = join(root, relativePath);
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, source);
  return {
    filePath,
    target: {
      absolutePath: filePath,
      kind: 'file',
      packageName: 'example',
      packageRelativePath: relativePath.replace('packages/example/', ''),
      packageRoot: join(root, 'packages/example'),
      relativePath
    }
  };
}

describe('analyzeScrap', () => {
  it('analyzes discovered test files', () => {
    const { target } = createFixture(`
      describe('suite', () => {
        it('works', () => {
          expect(true).toBe(true);
        });
      });
    `);

    const metrics = analyzeScrap(target);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.exampleCount).toBe(1);
    expect(metrics[0]?.remediationMode).toBe('STABLE');
  });

  it('parses tsx test files with the tsx script kind', () => {
    const { target } = createFixture(`
      test('renders', () => {
        const element = <div />;
        expect(element).toBeTruthy();
      });
    `, 'packages/example/tests/render.test.tsx');

    const metrics = analyzeScrap(target);
    expect(metrics[0]?.exampleCount).toBe(1);
    expect(metrics[0]?.filePath.endsWith('.tsx')).toBe(true);
  });
});

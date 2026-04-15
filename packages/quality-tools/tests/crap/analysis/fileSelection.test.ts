import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { createSourceFile, shouldIncludeFile } from '../../../src/crap/analysis/fileSelection';

function createFile(
  relativePath: string,
  source = 'export const value = 1;',
  config: Record<string, unknown> = {
    defaults: {
      crap: {
        exclude: ['**/e2e/**', '**/tests/**', '**/*.test.ts', '**/*.test.tsx']
      }
    }
  }
): { filePath: string; repoRoot: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-file-selection-'));
  writeFileSync(join(repoRoot, 'quality.config.json'), JSON.stringify(config));
  const filePath = join(repoRoot, relativePath);
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, source);
  return { filePath, repoRoot };
}

describe('shouldIncludeFile', () => {
  it('includes files in the selected scope and excludes test-like paths', () => {
    const { filePath, repoRoot } = createFile('packages/example/src/file.ts');
    expect(shouldIncludeFile(filePath, 'packages/example/src', repoRoot)).toBe(true);
    expect(shouldIncludeFile(join(repoRoot, 'packages/example/tests/file.test.ts'), undefined, repoRoot)).toBe(false);
  });

  it('includes a file when the filter scope exactly matches the file path', () => {
    const { filePath, repoRoot } = createFile('packages/example/src/file.ts');
    expect(shouldIncludeFile(filePath, 'packages/example/src/file.ts', repoRoot)).toBe(true);
  });

  it('requires a matching filter scope when one is provided', () => {
    const { filePath, repoRoot } = createFile('packages/example/src/file.ts');
    expect(shouldIncludeFile(filePath, 'packages/other/src', repoRoot)).toBe(false);
  });

  it('returns true for non-package files after the filter scope matches', () => {
    const { filePath, repoRoot } = createFile('tools/file.ts');
    expect(shouldIncludeFile(filePath, undefined, repoRoot)).toBe(true);
  });

  it('uses the unified config include and exclude sources for package files', () => {
    const { repoRoot } = createFile(
      'packages/example/src/allowed.ts',
      'export const allowed = true;',
      {
        defaults: {
          crap: {
            include: ['src/**/*.ts'],
            exclude: ['src/generated/**']
          }
        }
      }
    );

    const allowed = join(repoRoot, 'packages/example/src/allowed.ts');
    const excluded = join(repoRoot, 'packages/example/src/generated/file.ts');
    const outsideInclude = join(repoRoot, 'packages/example/tests/file.ts');
    mkdirSync(join(excluded, '..'), { recursive: true });
    mkdirSync(join(outsideInclude, '..'), { recursive: true });
    writeFileSync(excluded, 'export const excluded = true;');
    writeFileSync(outsideInclude, 'export const ignored = true;');

    expect(shouldIncludeFile(allowed, undefined, repoRoot)).toBe(true);
    expect(shouldIncludeFile(excluded, undefined, repoRoot)).toBe(false);
    expect(shouldIncludeFile(outsideInclude, undefined, repoRoot)).toBe(false);
  });
});

describe('createSourceFile', () => {
  it('creates a TS or TSX source file with the right script kind', () => {
    const { filePath: tsxFilePath } = createFile('packages/example/src/file.tsx', 'export const Element = <div />;');
    const { filePath: tsFilePath } = createFile('packages/example/src/file.ts', 'export const value = 1;');

    expect(createSourceFile(tsxFilePath).languageVariant).toBe(1);
    expect(createSourceFile(tsFilePath).languageVariant).toBe(0);
  });
});

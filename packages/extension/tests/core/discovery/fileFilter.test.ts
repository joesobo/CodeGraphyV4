import { describe, it, expect } from 'vitest';
import { shouldIncludeFile, FilterOptions } from '@/core/discovery/fileFilter';

function buildOptions(overrides: Partial<FilterOptions> = {}): FilterOptions {
  return {
    gitignore: null,
    allExclude: [],
    include: ['**/*'],
    extensions: [],
    fileExtension: '.ts',
    ...overrides,
  };
}

describe('shouldIncludeFile', () => {
  it('returns true when the file passes all filters', () => {
    expect(shouldIncludeFile('src/app.ts', buildOptions())).toBe(true);
  });

  it('returns false when gitignore ignores the path', () => {
    const gitignore = {
      ignores: (path: string) => path === 'dist/app.ts',
    } as unknown as FilterOptions['gitignore'];

    const result = shouldIncludeFile('dist/app.ts', buildOptions({ gitignore }));

    expect(result).toBe(false);
  });

  it('returns true when gitignore does not ignore the path', () => {
    const gitignore = {
      ignores: () => false,
    } as unknown as FilterOptions['gitignore'];

    const result = shouldIncludeFile('src/app.ts', buildOptions({ gitignore }));

    expect(result).toBe(true);
  });

  it('returns false when the path matches an exclude pattern', () => {
    const result = shouldIncludeFile(
      'node_modules/pkg/index.js',
      buildOptions({ allExclude: ['**/node_modules/**'], fileExtension: '.js' })
    );

    expect(result).toBe(false);
  });

  it('returns false when the path does not match any include pattern', () => {
    const result = shouldIncludeFile(
      'src/app.ts',
      buildOptions({ include: ['lib/**/*'] })
    );

    expect(result).toBe(false);
  });

  it('returns false when the file extension is not in the allowed list', () => {
    const result = shouldIncludeFile(
      'src/app.ts',
      buildOptions({ extensions: ['.js'], fileExtension: '.ts' })
    );

    expect(result).toBe(false);
  });

  it('returns true when extensions is empty (all extensions allowed)', () => {
    const result = shouldIncludeFile(
      'src/app.ts',
      buildOptions({ extensions: [], fileExtension: '.ts' })
    );

    expect(result).toBe(true);
  });

  it('returns true when the file extension matches the allowed list', () => {
    const result = shouldIncludeFile(
      'src/app.ts',
      buildOptions({ extensions: ['.ts', '.tsx'], fileExtension: '.ts' })
    );

    expect(result).toBe(true);
  });

  it('exclude check takes priority over include check', () => {
    // Path matches both include and exclude; exclude wins
    const result = shouldIncludeFile(
      'dist/app.ts',
      buildOptions({ allExclude: ['**/dist/**'], include: ['**/*'] })
    );

    expect(result).toBe(false);
  });

  it('handles Windows-style backslash paths in exclude matching', () => {
    const result = shouldIncludeFile(
      'node_modules\\pkg\\index.js',
      buildOptions({ allExclude: ['**/node_modules/**'], fileExtension: '.js' })
    );

    expect(result).toBe(false);
  });
});

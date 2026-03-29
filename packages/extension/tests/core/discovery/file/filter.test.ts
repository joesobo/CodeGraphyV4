import { describe, it, expect } from 'vitest';
import { shouldIncludeFile } from '../../../../src/core/discovery/file/filter';
import type { IFileFilterOptions } from '../../../../src/core/discovery/file/filter';

function opts(overrides: Partial<IFileFilterOptions> = {}): IFileFilterOptions {
  return {
    includePatterns: ['**/*'],
    excludePatterns: [],
    extensions: [],
    gitignore: null,
    ...overrides,
  };
}

describe('shouldIncludeFile', () => {
  it('returns true when all filters pass', () => {
    expect(shouldIncludeFile('src/app.ts', '/ws/src/app.ts', opts())).toBe(true);
  });

  it('returns false when gitignore marks the path as ignored', () => {
    const gitignore = { ignores: () => true };

    expect(shouldIncludeFile('src/app.ts', '/ws/src/app.ts', opts({ gitignore }))).toBe(false);
  });

  it('returns false when the path matches an exclude pattern', () => {
    expect(
      shouldIncludeFile(
        'node_modules/lib/index.js',
        '/ws/node_modules/lib/index.js',
        opts({ excludePatterns: ['**/node_modules/**'] }),
      ),
    ).toBe(false);
  });

  it('returns false when the path does not match any include pattern', () => {
    expect(
      shouldIncludeFile(
        'src/app.ts',
        '/ws/src/app.ts',
        opts({ includePatterns: ['**/*.md'] }),
      ),
    ).toBe(false);
  });

  it('returns false when the extension is not in the allowed list', () => {
    expect(
      shouldIncludeFile(
        'src/app.ts',
        '/ws/src/app.ts',
        opts({ extensions: ['.md'] }),
      ),
    ).toBe(false);
  });

  it('returns true when the extension is in the allowed list', () => {
    expect(
      shouldIncludeFile(
        'src/app.ts',
        '/ws/src/app.ts',
        opts({ extensions: ['.ts'] }),
      ),
    ).toBe(true);
  });

  it('returns true when extensions list is empty (all allowed)', () => {
    expect(
      shouldIncludeFile(
        'src/app.rs',
        '/ws/src/app.rs',
        opts({ extensions: [] }),
      ),
    ).toBe(true);
  });

  it('gitignore exclusion takes priority over include patterns', () => {
    const gitignore = { ignores: (path: string) => path === 'secret.ts' };

    expect(
      shouldIncludeFile(
        'secret.ts',
        '/ws/secret.ts',
        opts({ gitignore }),
      ),
    ).toBe(false);
  });
});

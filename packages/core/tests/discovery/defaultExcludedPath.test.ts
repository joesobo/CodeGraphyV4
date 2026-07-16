import { describe, expect, it } from 'vitest';
import { isDefaultExcludedPath } from '../../src/discovery/defaultExcludedPath';
import { DEFAULT_EXCLUDE } from '../../src/discovery/pathExclusions';

describe('discovery/defaultExcludedPath', () => {
  it('keeps the default exclude pattern contract in sync with fast excludes', () => {
    expect(DEFAULT_EXCLUDE).toEqual([
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/.codegraphy/**',
      '**/.turbo',
      '**/.turbo/**',
      '**/.worktrees',
      '**/.worktrees/**',
      '**/coverage/**',
      '**/.DS_Store',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.map',
    ]);
  });

  it('excludes generated and metadata path segments anywhere in the path', () => {
    expect(isDefaultExcludedPath('node_modules/react/index.js')).toBe(true);
    expect(isDefaultExcludedPath('packages/app/dist/index.js')).toBe(true);
    expect(isDefaultExcludedPath('packages/app/build/index.js')).toBe(true);
    expect(isDefaultExcludedPath('packages/app/out/index.js')).toBe(true);
    expect(isDefaultExcludedPath('.git/objects/HEAD')).toBe(true);
    expect(isDefaultExcludedPath('.codegraphy/graph.sqlite')).toBe(true);
    expect(isDefaultExcludedPath('packages/app/.turbo/cache')).toBe(true);
    expect(isDefaultExcludedPath('.worktrees/speed-up-codegraphy/src/app.ts')).toBe(true);
    expect(isDefaultExcludedPath('coverage/lcov.info')).toBe(true);
  });

  it('normalizes Windows separators before checking generated segments', () => {
    expect(isDefaultExcludedPath('packages\\app\\dist\\index.js')).toBe(true);
    expect(isDefaultExcludedPath('.codegraphy\\graph.sqlite')).toBe(true);
    expect(isDefaultExcludedPath('.worktrees\\branch\\src\\app.ts')).toBe(true);
  });

  it('excludes generated basenames and artifact suffixes', () => {
    expect(isDefaultExcludedPath('src/.DS_Store')).toBe(true);
    expect(isDefaultExcludedPath('src/vendor.min.js')).toBe(true);
    expect(isDefaultExcludedPath('src/generated/.DS_Store')).toBe(true);
    expect(isDefaultExcludedPath('src/assets/vendor.min.js')).toBe(true);
    expect(isDefaultExcludedPath('src/vendor.bundle.js')).toBe(true);
    expect(isDefaultExcludedPath('src/app.js.map')).toBe(true);
    expect(isDefaultExcludedPath('src/app.js.map/')).toBe(true);
  });

  it('does not exclude similarly named source paths', () => {
    expect(isDefaultExcludedPath('src/node_modules_cache/index.ts')).toBe(false);
    expect(isDefaultExcludedPath('src/building/index.ts')).toBe(false);
    expect(isDefaultExcludedPath('src/outbound/index.ts')).toBe(false);
    expect(isDefaultExcludedPath('src/codegraphy.ts')).toBe(false);
    expect(isDefaultExcludedPath('src/vendor.js')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXCLUDE,
  isDefaultExcludedPath,
  matchesAnyPattern,
  normalizeDiscoveryPath,
  shouldSkipKnownDirectory,
} from '../../src/discovery/pathMatching';

describe('pathMatching', () => {
  it('keeps the expected default exclude patterns', () => {
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
      '**/.claude/worktrees',
      '**/.claude/worktrees/**',
      '**/coverage/**',
      '**/.DS_Store',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.map',
    ]);
  });

  it('normalizes windows path separators', () => {
    expect(normalizeDiscoveryPath('src\\nested\\file.ts')).toBe('src/nested/file.ts');
  });

  it('matches nested files when using basename patterns', () => {
    expect(matchesAnyPattern('src/app.ts', ['*.ts'])).toBe(true);
  });

  it('matches when any pattern matches the normalized path', () => {
    expect(matchesAnyPattern('src/app.ts', ['*.md', '*.ts'])).toBe(true);
  });

  it('matches hidden files when dot matching is enabled', () => {
    expect(matchesAnyPattern('config/.env', ['*.env'])).toBe(true);
  });

  it('matches windows-style paths against forward-slash patterns', () => {
    expect(matchesAnyPattern('src\\app.ts', ['src/*.ts'])).toBe(true);
  });

  it('fast-matches default generated and build excludes', () => {
    expect(isDefaultExcludedPath('/workspace/packages/plugin-typescript/.turbo')).toBe(true);
    expect(isDefaultExcludedPath('/workspace/.worktrees/speed-up-codegraphy/src/app.ts')).toBe(true);
    expect(isDefaultExcludedPath('packages/extension/dist/webview/index.js')).toBe(true);
    expect(isDefaultExcludedPath('packages/core/src/index.ts')).toBe(false);
  });

  it('fast-matches default generated file suffix excludes', () => {
    expect(isDefaultExcludedPath('dist/index.js.map')).toBe(true);
    expect(isDefaultExcludedPath('src/vendor.bundle.js')).toBe(true);
    expect(isDefaultExcludedPath('src/vendor.min.js')).toBe(true);
    expect(isDefaultExcludedPath('src/vendor.js')).toBe(false);
  });

  it('skips exact node_modules and git directories', () => {
    expect(shouldSkipKnownDirectory('node_modules')).toBe(true);
    expect(shouldSkipKnownDirectory('.git')).toBe(true);
  });

  it('skips nested node_modules and git directories', () => {
    expect(shouldSkipKnownDirectory('packages/demo/node_modules')).toBe(false);
    expect(shouldSkipKnownDirectory('node_modules/react')).toBe(true);
    expect(shouldSkipKnownDirectory('.git/objects')).toBe(true);
  });

  it('does not skip similarly named directories', () => {
    expect(shouldSkipKnownDirectory('.github')).toBe(false);
    expect(shouldSkipKnownDirectory('node_modules_cache')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_EXCLUDE } from '../../src/discovery/pathExclusions';

describe('discovery/pathExclusions', () => {
  it('keeps default exclude patterns stable for workspace discovery', () => {
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
});

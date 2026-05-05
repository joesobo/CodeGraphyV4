import { describe, expect, it } from 'vitest';
import {
  createFreshDetail,
  createMissingDetail,
  createStaleDetail,
} from '../../../../src/extension/repoSettings/freshness/details';
import type { CodeGraphyIndexStaleReason } from '../../../../src/extension/repoSettings/freshness';

describe('repoSettings/freshness/details', () => {
  it('describes fresh and missing indexes', () => {
    expect(createFreshDetail()).toBe('CodeGraphy index is fresh.');
    expect(createMissingDetail()).toBe('CodeGraphy index is missing. Index the repo to build the graph.');
  });

  it('describes stale reasons by user-facing priority', () => {
    const detailCases: Array<{
      reason: CodeGraphyIndexStaleReason;
      pendingChangedFiles?: string[];
      expected: string;
    }> = [
      {
        reason: 'pending-changed-files',
        pendingChangedFiles: ['src/a.ts'],
        expected: 'CodeGraphy index is stale: 1 pending changed file.',
      },
      {
        reason: 'commit-changed',
        expected: 'CodeGraphy index is stale: the workspace commit changed since the last index.',
      },
      {
        reason: 'plugin-signature-changed',
        expected: 'CodeGraphy index is stale: installed CodeGraphy plugins changed.',
      },
      {
        reason: 'settings-signature-changed',
        expected: 'CodeGraphy index is stale: CodeGraphy settings changed.',
      },
      {
        reason: 'missing-indexed-commit',
        expected: 'CodeGraphy index is stale: the repo now has a commit, but the saved index does not.',
      },
      {
        reason: 'current-commit-unavailable',
        expected: 'CodeGraphy index is stale: the current workspace commit could not be resolved.',
      },
    ];

    for (const detailCase of detailCases) {
      expect(createStaleDetail([detailCase.reason], detailCase.pendingChangedFiles ?? [])).toBe(detailCase.expected);
    }
  });

  it('uses pending changed files before lower-priority stale reasons', () => {
    expect(createStaleDetail(
      ['commit-changed', 'pending-changed-files'],
      ['src/a.ts', 'src/b.ts'],
    )).toBe('CodeGraphy index is stale: 2 pending changed files.');
  });

  it('falls back when no stale reason has a specific detail', () => {
    expect(createStaleDetail([], [])).toBe('CodeGraphy index is stale. Reindex the repo to refresh it.');
  });
});

import { describe, expect, it } from 'vitest';
import { evaluateRepoFreshness } from '../../src/repoStatus/freshness';

describe('repoStatus/freshness', () => {
  it('reports a fresh repo when the indexed commit matches the current commit', () => {
    expect(evaluateRepoFreshness({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'abc123',
        pluginSignature: null,
        settingsSignature: null,
        pendingChangedFiles: [],
      },
      currentCommit: 'abc123',
    })).toMatchObject({
      freshness: 'fresh',
      staleReasons: [],
    });
  });

  it('reports a stale repo when HEAD changed since the last index', () => {
    expect(evaluateRepoFreshness({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'old-commit',
        pluginSignature: null,
        settingsSignature: null,
        pendingChangedFiles: [],
      },
      currentCommit: 'new-commit',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['commit-changed'],
    });
  });

  it('reports a stale repo when pending changed files were recorded after indexing', () => {
    expect(evaluateRepoFreshness({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'abc123',
        pluginSignature: null,
        settingsSignature: null,
        pendingChangedFiles: ['src/types.ts'],
      },
      currentCommit: 'abc123',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['pending-changed-files'],
    });
  });
});

import { describe, expect, it } from 'vitest';
import { collectStaleReasons } from '../../../../src/extension/repoSettings/freshness/reasons';
import type { ICodeGraphyRepoMeta } from '../../../../src/extension/repoSettings/meta';

const indexedMeta: ICodeGraphyRepoMeta = {
  version: 1,
  lastIndexedAt: '2026-04-27T12:00:00.000Z',
  lastIndexedCommit: 'abc123',
  pluginSignature: 'plugins',
  settingsSignature: 'settings',
  filesExcludedCount: 0,
  pendingChangedFiles: [],
};

describe('repoSettings/freshness/reasons', () => {
  it('returns no stale reasons when commits and signatures still match', () => {
    expect(collectStaleReasons({
      meta: indexedMeta,
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toEqual([]);
  });

  it('collects signature and commit reasons in stable order', () => {
    expect(collectStaleReasons({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: 'old',
        pendingChangedFiles: ['src/a.ts'],
      },
      currentCommit: 'new',
      pluginSignature: 'new-plugins',
      settingsSignature: 'new-settings',
    })).toEqual([
      'pending-changed-files',
      'plugin-signature-changed',
      'settings-signature-changed',
      'commit-changed',
    ]);
  });

  it('reports current commit unavailable only when an indexed commit exists', () => {
    expect(collectStaleReasons({
      meta: indexedMeta,
      currentCommit: null,
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toEqual(['current-commit-unavailable']);

    expect(collectStaleReasons({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: null,
      },
      currentCommit: null,
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toEqual([]);
  });

  it('reports missing indexed commit when the workspace now has a commit', () => {
    expect(collectStaleReasons({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: null,
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toEqual(['missing-indexed-commit']);
  });
});

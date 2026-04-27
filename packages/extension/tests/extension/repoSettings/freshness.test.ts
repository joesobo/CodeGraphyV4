import { describe, expect, it } from 'vitest';
import { evaluateCodeGraphyIndexStatus } from '../../../src/extension/repoSettings/freshness';

describe('repoSettings/freshness', () => {
  it('reports a fresh index when signatures and commit still match', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'abc123',
        pluginSignature: 'plugins',
        settingsSignature: 'settings',
        pendingChangedFiles: [],
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'fresh',
      hasIndex: true,
      staleReasons: [],
    });
  });

  it('reports a stale index when pending changed files exist', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'abc123',
        pluginSignature: 'plugins',
        settingsSignature: 'settings',
        pendingChangedFiles: ['src/types.ts'],
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      hasIndex: false,
      staleReasons: ['pending-changed-files'],
    });
  });

  it('reports a stale index when the current commit changed', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        version: 1,
        lastIndexedAt: '2026-04-27T12:00:00.000Z',
        lastIndexedCommit: 'old-commit',
        pluginSignature: 'plugins',
        settingsSignature: 'settings',
        pendingChangedFiles: [],
      },
      currentCommit: 'new-commit',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      hasIndex: false,
      staleReasons: ['commit-changed'],
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  clearCachedCommitState,
  getCachedGitHistoryChurnCounts,
  getCachedCommitList,
  hasCachedTimeline,
  persistCachedCommitState,
} from '../../../../src/extension/gitHistory/cache/state';
import type { CacheWorkspaceState } from '../../../../src/extension/gitHistory/cache/state';
import { CACHE_VERSION } from '../../../../src/extension/gitHistory/cache/stateKeys';

function createWorkspaceState(): CacheWorkspaceState & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();

  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    update: vi.fn((key: string, value: unknown) => {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.set(key, value);
      }

      return Promise.resolve();
    }),
    store,
  };
}

describe('gitHistory/cache/state', () => {
  it('persists and clears cached commit state', async () => {
    const workspaceState = createWorkspaceState();
    const commits = [{ sha: 'abc', timestamp: 1, message: 'init', author: 'Dev', parents: [] }];
    const pluginSignature = 'codegraphy.markdown@1.0.0|codegraphy.typescript@1.0.0';

    await persistCachedCommitState(workspaceState, commits, pluginSignature, {
      'src/app.ts': 2,
    });

    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCommits', commits);
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCacheVersion', CACHE_VERSION);
    expect(workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.timelinePluginSignature',
      pluginSignature,
    );
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineChurnCounts', {
      'src/app.ts': 2,
    });

    await clearCachedCommitState(workspaceState);

    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCommits', undefined);
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCacheVersion', undefined);
    expect(workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.timelinePluginSignature',
      undefined,
    );
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineChurnCounts', undefined);
  });

  it('reports timeline cache availability from the stored version and plugin signature', () => {
    const workspaceState = createWorkspaceState();
    const pluginSignature = 'codegraphy.markdown@1.0.0';

    expect(hasCachedTimeline(workspaceState, pluginSignature)).toBe(false);

    workspaceState.store.set('codegraphy.timelineCacheVersion', CACHE_VERSION);
    expect(hasCachedTimeline(workspaceState, pluginSignature)).toBe(false);

    workspaceState.store.set('codegraphy.timelinePluginSignature', pluginSignature);
    expect(hasCachedTimeline(workspaceState, pluginSignature)).toBe(true);

    workspaceState.store.set('codegraphy.timelineCacheVersion', '0.9.0');
    expect(hasCachedTimeline(workspaceState, pluginSignature)).toBe(false);

    workspaceState.store.set('codegraphy.timelineCacheVersion', CACHE_VERSION);
    workspaceState.store.set('codegraphy.timelinePluginSignature', 'codegraphy.markdown@0.9.0');
    expect(hasCachedTimeline(workspaceState, pluginSignature)).toBe(false);
  });

  it('returns cached commits only when the cache version and plugin signature match', () => {
    const workspaceState = createWorkspaceState();
    const commits = [{ sha: 'abc', timestamp: 1, message: 'init', author: 'Dev', parents: [] }];
    const pluginSignature = 'codegraphy.markdown@1.0.0';

    expect(getCachedCommitList(workspaceState, pluginSignature)).toBeNull();

    workspaceState.store.set('codegraphy.timelineCommits', commits);
    workspaceState.store.set('codegraphy.timelineCacheVersion', '0.9.0');
    workspaceState.store.set('codegraphy.timelinePluginSignature', pluginSignature);
    expect(getCachedCommitList(workspaceState, pluginSignature)).toBeNull();

    workspaceState.store.set('codegraphy.timelineCacheVersion', CACHE_VERSION);
    workspaceState.store.set('codegraphy.timelinePluginSignature', 'codegraphy.markdown@0.9.0');
    expect(getCachedCommitList(workspaceState, pluginSignature)).toBeNull();

    workspaceState.store.set('codegraphy.timelinePluginSignature', pluginSignature);

    expect(getCachedCommitList(workspaceState, pluginSignature)).toEqual(commits);
  });

  it('returns cached churn counts only when the timeline cache is valid', () => {
    const workspaceState = createWorkspaceState();
    const pluginSignature = 'codegraphy.markdown@1.0.0';
    const churnCounts = { 'src/app.ts': 4 };

    workspaceState.store.set('codegraphy.timelineChurnCounts', churnCounts);
    workspaceState.store.set('codegraphy.timelineCacheVersion', '0.9.0');
    workspaceState.store.set('codegraphy.timelinePluginSignature', pluginSignature);
    expect(getCachedGitHistoryChurnCounts(workspaceState, pluginSignature)).toBeNull();

    workspaceState.store.set('codegraphy.timelineCacheVersion', CACHE_VERSION);
    workspaceState.store.set('codegraphy.timelinePluginSignature', 'codegraphy.markdown@0.9.0');
    expect(getCachedGitHistoryChurnCounts(workspaceState, pluginSignature)).toBeNull();

    workspaceState.store.set('codegraphy.timelinePluginSignature', pluginSignature);
    expect(getCachedGitHistoryChurnCounts(workspaceState, pluginSignature)).toEqual(churnCounts);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  clearCachedCommitState,
  getCachedCommitList,
  hasCachedTimeline,
  persistCachedCommitState,
} from '../../../src/extension/gitHistory/cache/state';

function createWorkspaceState() {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(<T>(key: string) => store.get(key) as T | undefined),
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

    await persistCachedCommitState(workspaceState, commits);

    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCommits', commits);
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCacheVersion', '1.1.0');

    await clearCachedCommitState(workspaceState);

    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCommits', undefined);
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineCacheVersion', undefined);
  });

  it('reports timeline cache availability from the stored version', () => {
    const workspaceState = createWorkspaceState();

    expect(hasCachedTimeline(workspaceState)).toBe(false);

    workspaceState.store.set('codegraphy.timelineCacheVersion', '1.1.0');
    expect(hasCachedTimeline(workspaceState)).toBe(true);

    workspaceState.store.set('codegraphy.timelineCacheVersion', '0.9.0');
    expect(hasCachedTimeline(workspaceState)).toBe(false);
  });

  it('returns cached commits only when the cache version matches', () => {
    const workspaceState = createWorkspaceState();
    const commits = [{ sha: 'abc', timestamp: 1, message: 'init', author: 'Dev', parents: [] }];

    expect(getCachedCommitList(workspaceState)).toBeNull();

    workspaceState.store.set('codegraphy.timelineCommits', commits);
    workspaceState.store.set('codegraphy.timelineCacheVersion', '0.9.0');
    expect(getCachedCommitList(workspaceState)).toBeNull();

    workspaceState.store.set('codegraphy.timelineCacheVersion', '1.1.0');

    expect(getCachedCommitList(workspaceState)).toEqual(commits);
  });
});

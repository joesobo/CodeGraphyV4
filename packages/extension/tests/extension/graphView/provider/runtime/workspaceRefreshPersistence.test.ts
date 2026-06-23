import { beforeEach, describe, expect, it, vi } from 'vitest';

const metaState = vi.hoisted(() => ({
  pendingChangedFiles: [] as string[],
  writes: [] as Array<{ workspaceRoot: string; pendingChangedFiles: string[] }>,
}));

vi.mock('../../../../../src/extension/repoSettings/meta', () => ({
  readCodeGraphyRepoMeta: vi.fn((workspaceRoot: string) => ({
    workspaceRoot,
    pendingChangedFiles: [...metaState.pendingChangedFiles],
  })),
  writeCodeGraphyRepoMeta: vi.fn(
    (workspaceRoot: string, meta: { pendingChangedFiles: string[] }) => {
      metaState.writes.push({
        workspaceRoot,
        pendingChangedFiles: [...meta.pendingChangedFiles],
      });
    },
  ),
}));

import {
  loadPersistedWorkspaceRefresh,
  persistPendingWorkspaceRefresh,
} from '../../../../../src/extension/graphView/provider/runtime/workspaceRefreshPersistence';

describe('graphView/provider/runtime/workspaceRefreshPersistence', () => {
  beforeEach(() => {
    metaState.pendingChangedFiles = [];
    metaState.writes = [];
  });

  it('persists pending workspace file paths when a workspace root exists', () => {
    persistPendingWorkspaceRefresh('/test/workspace', ['src/a.ts', 'src/b.ts']);

    expect(metaState.writes).toEqual([
      {
        workspaceRoot: '/test/workspace',
        pendingChangedFiles: ['src/a.ts', 'src/b.ts'],
      },
    ]);
  });

  it('filters generated pending paths before persisting workspace refresh metadata', () => {
    persistPendingWorkspaceRefresh('/test/workspace', [
      '/test/workspace',
      '/test/workspace/packages/core/.turbo',
      '/test/workspace/.worktrees/speed-up-codegraphy/src/index.ts',
      '/test/workspace/src/a.ts',
    ]);

    expect(metaState.writes).toEqual([
      {
        workspaceRoot: '/test/workspace',
        pendingChangedFiles: ['/test/workspace/src/a.ts'],
      },
    ]);
  });

  it('skips persistence and loading when no workspace root exists', () => {
    persistPendingWorkspaceRefresh(undefined, ['src/a.ts']);

    expect(metaState.writes).toEqual([]);
    expect(loadPersistedWorkspaceRefresh(undefined)).toBeUndefined();
  });

  it('loads pending workspace refresh data from repo metadata', () => {
    metaState.pendingChangedFiles = ['src/a.ts', 'src/b.ts'];

    expect(loadPersistedWorkspaceRefresh('/test/workspace')).toEqual({
      filePaths: new Set(['src/a.ts', 'src/b.ts']),
      gitignoreRefresh: false,
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
  });

  it('cleans generated pending paths when loading persisted workspace refresh data', () => {
    metaState.pendingChangedFiles = [
      '/test/workspace',
      '/test/workspace/packages/core/.turbo',
      '/test/workspace/.worktrees/speed-up-codegraphy/src/index.ts',
      '/test/workspace/src/a.ts',
    ];

    expect(loadPersistedWorkspaceRefresh('/test/workspace')).toEqual({
      filePaths: new Set(['/test/workspace/src/a.ts']),
      gitignoreRefresh: false,
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
    expect(metaState.writes).toEqual([
      {
        workspaceRoot: '/test/workspace',
        pendingChangedFiles: ['/test/workspace/src/a.ts'],
      },
    ]);
  });

  it('marks persisted gitignore changes as metadata refreshes', () => {
    metaState.pendingChangedFiles = ['src/a.ts', '/test/workspace/.gitignore'];

    expect(loadPersistedWorkspaceRefresh('/test/workspace')).toEqual({
      filePaths: new Set(['src/a.ts', '/test/workspace/.gitignore']),
      gitignoreRefresh: true,
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
  });
});

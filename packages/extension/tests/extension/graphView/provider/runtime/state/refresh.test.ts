import { describe, expect, it } from 'vitest';
import {
  invalidatePluginFiles,
  invalidateWorkspaceFiles,
  mergePendingWorkspaceRefresh,
} from '../../../../../../src/extension/graphView/provider/runtime/state/refresh';

describe('graphView/provider/runtime/state/refresh', () => {
  it('delegates invalidation calls when an analyzer exists', () => {
    const analyzer = {
      invalidateWorkspaceFiles: (filePaths: readonly string[]) => [...filePaths, 'workspace'],
      invalidatePluginFiles: (pluginIds: readonly string[]) => [...pluginIds, 'plugin'],
    } as never;

    expect(invalidateWorkspaceFiles(analyzer, ['src/a.ts'])).toEqual(['src/a.ts', 'workspace']);
    expect(invalidatePluginFiles(analyzer, ['ts'])).toEqual(['ts', 'plugin']);
    expect(invalidateWorkspaceFiles(undefined, ['src/a.ts'])).toEqual([]);
    expect(invalidatePluginFiles(undefined, ['ts'])).toEqual([]);
  });

  it('merges pending workspace refresh state and keeps the latest log message', () => {
    const initial = mergePendingWorkspaceRefresh(undefined, 'first', ['src/a.ts']);
    const merged = mergePendingWorkspaceRefresh(initial, 'second', ['src/b.ts', 'src/a.ts']);

    expect(merged.logMessage).toBe('second');
    expect([...merged.filePaths]).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

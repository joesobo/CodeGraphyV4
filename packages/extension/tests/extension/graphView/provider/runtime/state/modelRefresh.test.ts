import { beforeEach, describe, expect, it } from 'vitest';
import {
  createContext,
  getStateHarness,
  resetStateHarness,
  TestRuntimeState,
  vscode,
} from './model.fixture';

const stateHarness = getStateHarness();

describe('graphView/provider/runtime/state/model', () => {
  beforeEach(resetStateHarness);

  it('persists pending workspace refreshes and flushes through refreshChangedFiles when available', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const refreshChangedFiles = vi.fn(async () => undefined);
    stateHarness.methodContainers.refresh.refreshChangedFiles = refreshChangedFiles;
    stateHarness.isGraphViewVisible.mockReturnValue(true);
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    ) as TestRuntimeState & {
      _pendingWorkspaceRefresh?: { filePaths: Set<string>; logMessage: string };
    };

    runtime.markWorkspaceRefreshPending('[CodeGraphy] File saved', ['/workspace/src/a.ts']);
    runtime.markWorkspaceRefreshPending('[CodeGraphy] File created', ['/workspace/src/b.ts']);
    runtime.flushPendingWorkspaceRefresh();

    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      1,
      '/workspace',
      ['/workspace/src/a.ts'],
    );
    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      2,
      '/workspace',
      ['/workspace/src/a.ts', '/workspace/src/b.ts'],
    );
    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      3,
      '/workspace',
      [],
    );
    expect(refreshChangedFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
    ]);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created');
    expect(runtime._pendingWorkspaceRefresh).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('flushes pending gitignore refreshes through metadata refresh when available', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const refreshChangedFiles = vi.fn(async () => undefined);
    const refreshGitignoreMetadata = vi.fn(async () => undefined);
    stateHarness.methodContainers.refresh.refreshChangedFiles = refreshChangedFiles;
    stateHarness.methodContainers.refresh.refreshGitignoreMetadata = refreshGitignoreMetadata;
    stateHarness.isGraphViewVisible.mockReturnValue(true);
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.markWorkspaceRefreshPending(
      '[CodeGraphy] .gitignore changed',
      ['/workspace/.gitignore'],
      { gitignoreRefresh: true },
    );
    runtime.flushPendingWorkspaceRefresh();

    expect(refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] .gitignore changed');

    consoleSpy.mockRestore();
  });

  it('uses the default empty file list when marking a workspace refresh without paths', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.markWorkspaceRefreshPending('[CodeGraphy] Workspace settings changed');

    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenCalledWith('/workspace', []);
  });

  it('flushes persisted workspace refreshes through the fallback refresh path', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    stateHarness.isGraphViewVisible.mockReturnValue(true);
    stateHarness.loadPersistedWorkspaceRefresh.mockReturnValue({
      filePaths: new Set(['/workspace/src/c.ts']),
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.flushPendingWorkspaceRefresh();

    expect(stateHarness.loadPersistedWorkspaceRefresh).toHaveBeenCalledWith('/workspace');
    expect(stateHarness.invalidateWorkspaceFiles).toHaveBeenCalledWith(
      expect.anything(),
      ['/workspace/src/c.ts'],
    );
    expect(stateHarness.methodContainers.refresh.refresh).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] Applying pending workspace changes');

    consoleSpy.mockRestore();
  });

  it('skips flush work when the graph is closed or when no refresh state exists', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.flushPendingWorkspaceRefresh();
    expect(stateHarness.loadPersistedWorkspaceRefresh).not.toHaveBeenCalled();

    stateHarness.isGraphViewVisible.mockReturnValue(true);
    runtime.flushPendingWorkspaceRefresh();
    expect(stateHarness.loadPersistedWorkspaceRefresh).toHaveBeenCalledWith('/workspace');
    expect(stateHarness.methodContainers.refresh.refresh).not.toHaveBeenCalled();
  });

});

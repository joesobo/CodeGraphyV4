import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  refreshWorkspaceFileOperation,
  refreshWorkspaceRenameOperation,
  refreshWorkspaceSavedDocument,
} from '../../../../src/extension/workspaceFiles/refresh/operations';

function makeProvider() {
  return {
    emitEvent: vi.fn(),
    refreshGitignoreMetadata: vi.fn().mockResolvedValue(undefined),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

function uri(filePath: string): vscode.Uri {
  return { fsPath: filePath } as vscode.Uri;
}

describe('workspaceFiles/refresh/operations', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refreshes saved documents and emits file changed events', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider();

    refreshWorkspaceSavedDocument(
      provider as never,
      { uri: uri('/workspace/src/app.ts') } as vscode.TextDocument,
    );
    vi.advanceTimersByTime(31);
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/app.ts']);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/src/app.ts',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File saved, refreshing graph');
  });

  it('runs a metadata-only graph refresh when gitignore is saved', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider();

    refreshWorkspaceSavedDocument(
      provider as never,
      { uri: uri('/workspace/.gitignore') } as vscode.TextDocument,
    );
    vi.advanceTimersByTime(31);
    expect(provider.refreshGitignoreMetadata).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(provider.refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/.gitignore',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File saved, refreshing graph');
  });

  it('ignores saved workspace settings artifacts', () => {
    const provider = makeProvider();

    refreshWorkspaceSavedDocument(
      provider as never,
      { uri: uri('/workspace/.vscode/settings.json') } as vscode.TextDocument,
    );

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('refreshes create operations and emits an event for each refreshable path', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();

    refreshWorkspaceFileOperation(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      [uri('/workspace/src/a.ts'), uri('/workspace/src/b.ts')],
      'workspace:fileCreated',
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
    ]);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/a.ts',
    });
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/b.ts',
    });
  });

  it('limits create follow-up refreshes to directories that may gain nested descendants', async () => {
    vi.useFakeTimers();
    const provider = {
      ...makeProvider(),
      refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(vscode.workspace.fs.stat).mockImplementation(async target => ({
      type: target.fsPath.endsWith('/generated')
        ? vscode.FileType.Directory
        : vscode.FileType.File,
    } as vscode.FileStat));

    refreshWorkspaceFileOperation(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      [
        uri('/workspace/src/core/menuCreated.ts'),
        uri('/workspace/src/features/generated'),
      ],
      'workspace:fileCreated',
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(provider.refreshChangedFiles).toHaveBeenCalledWith([
      '/workspace/src/core/menuCreated.ts',
      '/workspace/src/features/generated',
    ]);
    await vi.advanceTimersByTimeAsync(1_501);
    expect(provider.refreshChangedFiles).toHaveBeenCalledTimes(2);
    expect(provider.refreshChangedFiles).toHaveBeenLastCalledWith([
      '/workspace/src/features/generated',
    ]);
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/core/menuCreated.ts',
    });
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/features/generated',
    });
  });

  it('refreshes delete operations once without a create follow-up', async () => {
    vi.useFakeTimers();
    const provider = {
      ...makeProvider(),
      refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    };

    refreshWorkspaceFileOperation(
      provider as never,
      '[CodeGraphy] File deleted, refreshing graph',
      [uri('/workspace/src/deleted.ts')],
      'workspace:fileDeleted',
    );
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_501);

    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(provider.refreshChangedFiles).toHaveBeenCalledWith([
      '/workspace/src/deleted.ts',
    ]);
  });

  it('runs a metadata-only graph refresh when gitignore is created or deleted', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();

    refreshWorkspaceFileOperation(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      [uri('/workspace/.gitignore')],
      'workspace:fileCreated',
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(provider.refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/.gitignore',
    });
  });

  it('does not emit file operation events when every path is ignored', () => {
    vi.useFakeTimers();
    const provider = makeProvider();

    refreshWorkspaceFileOperation(
      provider as never,
      '[CodeGraphy] File deleted, refreshing graph',
      [uri('/workspace/.vscode/settings.json')],
      'workspace:fileDeleted',
    );
    vi.advanceTimersByTime(500);

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('refreshes rename operations with old and new paths', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider();

    refreshWorkspaceRenameOperation(provider as never, [
      {
        oldUri: uri('/workspace/src/old.ts'),
        newUri: uri('/workspace/src/new.ts'),
      },
    ]);
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/old.ts',
      '/workspace/src/new.ts',
    ]);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileRenamed', {
      oldPath: '/workspace/src/old.ts',
      newPath: '/workspace/src/new.ts',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File renamed, refreshing graph');
  });

  it('does not emit rename operations when every path is ignored', () => {
    vi.useFakeTimers();
    const provider = makeProvider();

    refreshWorkspaceRenameOperation(provider as never, [
      {
        oldUri: uri('/workspace/.vscode/settings.json'),
        newUri: uri('/workspace/.vscode/tasks.json'),
      },
    ]);
    vi.advanceTimersByTime(500);

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });
});

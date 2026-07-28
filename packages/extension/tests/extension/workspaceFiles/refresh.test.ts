import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerFileWatcher,
  registerSaveHandler,
} from '../../../src/extension/workspaceFiles/refresh/watchers';
import { scheduleWorkspaceRefresh } from '../../../src/extension/workspaceFiles/refresh/scheduler';

function makeProvider() {
  return {
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    refreshPersistedWorkspaceCache: vi.fn().mockResolvedValue(true),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

describe('workspaceFiles/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces pending refreshes and keeps the latest message', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(provider as never, '[CodeGraphy] File saved, refreshing graph');
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      ['/workspace/new-file.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/new-file.ts']);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('refreshes the persisted cache while the graph is closed', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File saved, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshPersistedWorkspaceCache).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
    ]);
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
    expect(provider.markWorkspaceRefreshPending).not.toHaveBeenCalled();
  });

  it('batches persisted-cache file paths while the graph is hidden', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File saved, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      ['/workspace/src/b.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshPersistedWorkspaceCache).toHaveBeenCalledOnce();
    expect(provider.refreshPersistedWorkspaceCache).toHaveBeenCalledWith([
      '/workspace/src/b.ts',
      '/workspace/src/a.ts',
    ]);
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
    expect(provider.markWorkspaceRefreshPending).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('refreshes the persisted cache when the graph closes before the timer fires', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshPersistedWorkspaceCache).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
    ]);
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
    expect(provider.markWorkspaceRefreshPending).not.toHaveBeenCalled();
  });

  it('falls back to invalidateWorkspaceFiles and refresh when changed-file refresh is unavailable', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File deleted, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
    ]);
    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] File deleted, refreshing graph',
    );

    consoleSpy.mockRestore();
  });

  it('does not require a pending-refresh hook while the graph is closed', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);
    delete (provider as Partial<typeof provider>).markWorkspaceRefreshPending;

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File saved, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshPersistedWorkspaceCache).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
    ]);
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
  });

  it('registers save and watcher listeners through the public handlers', () => {
    const context = makeContext();
    const provider = makeProvider();
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerSaveHandler(context as never, provider as never);
    registerFileWatcher(context as never, provider as never);

    expect(context.subscriptions).toHaveLength(12);
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
  });
});

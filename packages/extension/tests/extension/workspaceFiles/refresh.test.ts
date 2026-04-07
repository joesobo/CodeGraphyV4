import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerFileWatcher,
  registerSaveHandler,
  scheduleWorkspaceRefresh,
} from '../../../src/extension/workspaceFiles/refresh';

function makeProvider() {
  return {
    trackFileVisit: vi.fn().mockResolvedValue(undefined),
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
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
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(provider as never, '[CodeGraphy] File saved, refreshing graph');
    scheduleWorkspaceRefresh(provider as never, '[CodeGraphy] File created, refreshing graph');
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
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

    expect(context.subscriptions).toHaveLength(4);
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
  });
});

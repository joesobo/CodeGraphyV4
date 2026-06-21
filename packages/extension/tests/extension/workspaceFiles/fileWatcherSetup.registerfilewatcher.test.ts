import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerFileWatcher
} from '../../../src/extension/workspaceFiles/refresh/watchers';

function makeProvider() {
  return {
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
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

function makeWatcher(listeners: {
  change?: (uri: { fsPath: string }) => void;
  create?: (uri: { fsPath: string }) => void;
  delete?: (uri: { fsPath: string }) => void;
}) {
  return {
    onDidCreate: vi.fn((cb) => {
      listeners.create = cb;
      return { dispose: vi.fn() };
    }),
    onDidDelete: vi.fn((cb) => {
      listeners.delete = cb;
      return { dispose: vi.fn() };
    }),
    onDidChange: vi.fn((cb) => {
      listeners.change = cb;
      return { dispose: vi.fn() };
    }),
    dispose: vi.fn(),
  } as unknown as vscode.FileSystemWatcher;
}

function installWatcherMocks() {
  const fileListeners: {
    change?: (uri: { fsPath: string }) => void;
    create?: (uri: { fsPath: string }) => void;
    delete?: (uri: { fsPath: string }) => void;
  } = {};
  const gitignoreListeners: {
    change?: (uri: { fsPath: string }) => void;
    create?: (uri: { fsPath: string }) => void;
    delete?: (uri: { fsPath: string }) => void;
  } = {};
  vi.mocked(vscode.workspace.createFileSystemWatcher).mockImplementation((globPattern) =>
    globPattern === '**/.gitignore'
      ? makeWatcher(gitignoreListeners)
      : makeWatcher(fileListeners),
  );

  return { fileListeners, gitignoreListeners };
}

describe('registerFileWatcher', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    afterEach(() => {
      vi.useRealTimers();
    });



    it('adds file watcher and workspace file-operation subscriptions', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      expect(context.subscriptions.length).toBe(11);
    });



    it('refreshes graph and emits event on file creation', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      const { fileListeners } = installWatcherMocks();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      fileListeners.create!({ fsPath: '/workspace/new-file.ts' });
      vi.advanceTimersByTime(500);

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
        filePath: '/workspace/new-file.ts',
      });
    });



    it('refreshes graph and emits event on file deletion', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      const { fileListeners } = installWatcherMocks();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      fileListeners.delete!({ fsPath: '/workspace/deleted-file.ts' });
      vi.advanceTimersByTime(500);

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileDeleted', {
        filePath: '/workspace/deleted-file.ts',
      });
    });



    it('refreshes graph and emits events when a folder is deleted through the workspace explorer', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.workspace.onDidDeleteFiles as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (event: {
        files: Array<{ fsPath: string }>;
      }) => void;

      listener({ files: [{ fsPath: '/workspace/test' }] });
      vi.advanceTimersByTime(500);

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileDeleted', {
        filePath: '/workspace/test',
      });
    });



    it('does not refresh for discovery-excluded file creation events', () => {
      const context = makeContext();
      const provider = makeProvider();

      const { fileListeners } = installWatcherMocks();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      fileListeners.create!({ fsPath: '/workspace/node_modules/react/index.js' });

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).not.toHaveBeenCalled();
    });



    it('does not refresh for workspace config artifact deletion events', () => {
      const context = makeContext();
      const provider = makeProvider();

      const { fileListeners } = installWatcherMocks();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      fileListeners.delete!({ fsPath: '/workspace/.vscode/settings.json' });

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).not.toHaveBeenCalled();
    });



    it('does not refresh on file watcher events when CodeGraphy is not open', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();
      provider.isGraphOpen.mockReturnValue(false);

      const { fileListeners } = installWatcherMocks();

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      fileListeners.create!({ fsPath: '/workspace/new-file.ts' });
      vi.advanceTimersByTime(600);

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
        filePath: '/workspace/new-file.ts',
      });
    });
});

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

      expect(context.subscriptions.length).toBe(7);
    });



    it('refreshes graph and emits event on file creation', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      // Capture the watcher mock's onDidCreate listener
      let createListener: ((uri: { fsPath: string }) => void) | undefined;
      const mockOnDidCreate = vi.fn((cb) => {
        createListener = cb;
        return { dispose: vi.fn() };
      });
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: mockOnDidCreate,
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      createListener!({ fsPath: '/workspace/new-file.ts' });
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

      let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
      const mockOnDidDelete = vi.fn((cb) => {
        deleteListener = cb;
        return { dispose: vi.fn() };
      });
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: mockOnDidDelete,
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      deleteListener!({ fsPath: '/workspace/deleted-file.ts' });
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

      let createListener: ((uri: { fsPath: string }) => void) | undefined;
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: vi.fn((cb) => {
          createListener = cb;
          return { dispose: vi.fn() };
        }),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      createListener!({ fsPath: '/workspace/node_modules/react/index.js' });

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).not.toHaveBeenCalled();
    });



    it('does not refresh for workspace config artifact deletion events', () => {
      const context = makeContext();
      const provider = makeProvider();

      let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn((cb) => {
          deleteListener = cb;
          return { dispose: vi.fn() };
        }),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      deleteListener!({ fsPath: '/workspace/.vscode/settings.json' });

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).not.toHaveBeenCalled();
    });



    it('does not refresh on file watcher events when CodeGraphy is not open', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();
      provider.isGraphOpen.mockReturnValue(false);

      let createListener: ((uri: { fsPath: string }) => void) | undefined;
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: vi.fn((cb) => {
          createListener = cb;
          return { dispose: vi.fn() };
        }),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      createListener!({ fsPath: '/workspace/new-file.ts' });
      vi.advanceTimersByTime(600);

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
        filePath: '/workspace/new-file.ts',
      });
    });
});

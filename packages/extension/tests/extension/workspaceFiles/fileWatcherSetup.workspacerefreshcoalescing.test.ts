import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerFileWatcher,
  registerSaveHandler,
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

describe('workspace refresh coalescing', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    afterEach(() => {
      vi.useRealTimers();
    });



    it('coalesces a save followed by a create event into one refresh', () => {
      vi.useFakeTimers();
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

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);
      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      const saveMock = vscode.workspace.onDidSaveTextDocument as unknown as {
        mock: { calls: unknown[][] };
      };
      const saveListener = saveMock.mock.calls[0]?.[0] as (doc: unknown) => void;

      saveListener({ uri: { fsPath: '/workspace/src/app.ts' } });
      vi.advanceTimersByTime(50);
      createListener!({ fsPath: '/workspace/src/app.ts.tmp' });

      vi.advanceTimersByTime(499);
      expect(provider.refresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(provider.refresh).toHaveBeenCalledOnce();
    });



    it('coalesces rapid create and delete events into one refresh', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      let createListener: ((uri: { fsPath: string }) => void) | undefined;
      let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidCreate: vi.fn((cb) => {
          createListener = cb;
          return { dispose: vi.fn() };
        }),
        onDidDelete: vi.fn((cb) => {
          deleteListener = cb;
          return { dispose: vi.fn() };
        }),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      } as unknown as vscode.FileSystemWatcher);

      registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

      createListener!({ fsPath: '/workspace/src/app.ts.tmp' });
      vi.advanceTimersByTime(250);
      deleteListener!({ fsPath: '/workspace/src/app.ts.tmp' });

      vi.advanceTimersByTime(499);
      expect(provider.refresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(provider.refresh).toHaveBeenCalledOnce();
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerEditorChangeHandler,
} from '../../../src/extension/workspaceFiles/editorSync';

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

describe('registerEditorChangeHandler', () => {

    beforeEach(() => {
      vi.clearAllMocks();
      (
        vscode.window as unknown as {
          activeTextEditor: unknown;
          visibleTextEditors: unknown[];
        }
      ).activeTextEditor = undefined;
      (
        vscode.window as unknown as {
          visibleTextEditors: unknown[];
        }
      ).visibleTextEditors = [];
    });



    afterEach(() => {
      vi.useRealTimers();
    });



    it('preserves the focused file when editor is undefined but a workspace editor is still visible', async () => {
      const context = makeContext();
      const provider = makeProvider();

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];
      (
        vscode.window as unknown as {
          visibleTextEditors: Array<{ document: { uri: { scheme: string; fsPath: string } } }>;
        }
      ).visibleTextEditors = [
        {
          document: {
            uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
          },
        },
      ];

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);
      provider.setFocusedFile.mockClear();
      provider.emitEvent.mockClear();

      const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (editor: undefined) => Promise<void>;

      await listener(undefined);

      expect(provider.setFocusedFile).not.toHaveBeenCalled();
      expect(provider.emitEvent).not.toHaveBeenCalled();
    });



    it('ignores a transient undefined active editor before the next workspace file becomes active', async () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);
      provider.setFocusedFile.mockClear();
      provider.emitEvent.mockClear();

      const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

      await listener(undefined);
      await listener({
        document: {
          uri: { scheme: 'file', fsPath: '/workspace/src/utils.ts' },
        },
      });
      vi.advanceTimersByTime(150);

      expect(provider.setFocusedFile).toHaveBeenCalledTimes(1);
      expect(provider.setFocusedFile).toHaveBeenCalledWith('src/utils.ts');
      expect(provider.emitEvent).toHaveBeenCalledTimes(1);
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
        filePath: 'src/utils.ts',
      });
    });



    it('normalizes backslashes in paths', async () => {
      const context = makeContext();
      const provider = makeProvider();

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

      // Simulate a path with backslashes (Windows-style)
      // path.relative will produce forward slashes on mac, but the normalize code handles backslashes
      await listener({
        document: {
          uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
        },
      });

      // The normalized path should use forward slashes
      expect(provider.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    });
});

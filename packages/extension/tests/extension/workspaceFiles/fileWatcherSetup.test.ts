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



    it('adds a subscription to the context', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

      expect(context.subscriptions.length).toBe(1);
    });



    it('sets focused file for workspace-relative files', async () => {
      const context = makeContext();
      const provider = makeProvider();
      let listener: ((editor: unknown) => Promise<void>) | undefined;

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];
      vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((callback) => {
        listener = callback as (editor: unknown) => Promise<void>;
        return { dispose: vi.fn() } as unknown as vscode.Disposable;
      });

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);
      provider.setFocusedFile.mockClear();
      provider.emitEvent.mockClear();

      await listener!({
        document: {
          uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
        },
      });
      expect(provider.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
        filePath: 'src/app.ts',
      });
    });



    it('seeds the current active editor when registering the listener', async () => {
      const context = makeContext();
      const provider = makeProvider();

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];
      (
        vscode.window as unknown as {
          activeTextEditor: { document: { uri: { scheme: string; fsPath: string } } } | undefined;
        }
      ).activeTextEditor = {
        document: {
          uri: { scheme: 'file', fsPath: '/workspace/src/game/player.gd' },
        },
      };

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);
      await Promise.resolve();
      expect(provider.setFocusedFile).toHaveBeenCalledWith('src/game/player.gd');
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
        filePath: 'src/game/player.gd',
      });
    });



    it('does not track files outside the workspace', async () => {
      const context = makeContext();
      const provider = makeProvider();
      let listener: ((editor: unknown) => Promise<void>) | undefined;

      (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
        { uri: { fsPath: '/workspace' } },
      ];
      vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((callback) => {
        listener = callback as (editor: unknown) => Promise<void>;
        return { dispose: vi.fn() } as unknown as vscode.Disposable;
      });

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);
      provider.setFocusedFile.mockClear();
      provider.emitEvent.mockClear();

      await listener!({
        document: {
          uri: { scheme: 'file', fsPath: '/other-project/src/app.ts' },
        },
      });
      expect(provider.setFocusedFile).not.toHaveBeenCalled();
    });



    it('does not track non-file scheme documents', async () => {
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

      await listener({
        document: {
          uri: { scheme: 'untitled', fsPath: '/workspace/untitled' },
        },
      });
    });



    it('does not track when no workspace folders exist', async () => {
      const context = makeContext();
      const provider = makeProvider();

      (vscode.workspace as unknown as { workspaceFolders: undefined }).workspaceFolders = undefined;

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

      await listener({
        document: {
          uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
        },
      });
    });



    it('clears focused file when editor is undefined and no workspace editors remain visible', async () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      (
        vscode.window as unknown as {
          visibleTextEditors: unknown[];
        }
      ).visibleTextEditors = [];

      registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (editor: undefined) => Promise<void>;

      await listener(undefined);
      vi.advanceTimersByTime(150);

      expect(provider.setFocusedFile).toHaveBeenCalledWith(undefined);
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
        filePath: undefined,
      });
    });
});

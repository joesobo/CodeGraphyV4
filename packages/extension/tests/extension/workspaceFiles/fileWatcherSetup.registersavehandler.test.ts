import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerSaveHandler
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

describe('registerSaveHandler', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    afterEach(() => {
      vi.useRealTimers();
    });



    it('adds a subscription to the context', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

      expect(context.subscriptions.length).toBe(1);
    });



    it('refreshes graph after debounce on regular file save', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

      listener({ uri: { fsPath: '/workspace/src/app.ts' } });
      vi.advanceTimersByTime(500);

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
        filePath: '/workspace/src/app.ts',
      });
    });



    it('debounces multiple rapid saves into a single refresh', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

      listener({ uri: { fsPath: '/workspace/src/a.ts' } });
      vi.advanceTimersByTime(25);
      listener({ uri: { fsPath: '/workspace/src/b.ts' } });
      vi.advanceTimersByTime(50);

      expect(provider.refresh).toHaveBeenCalledOnce();
    });



    it('skips refresh for workspace settings files', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

      listener({ uri: { fsPath: '/workspace/.vscode/settings.json' } });
      vi.advanceTimersByTime(600);

      expect(provider.refresh).not.toHaveBeenCalled();
    });



    it('does not refresh on save when CodeGraphy is not open', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();
      provider.isGraphOpen.mockReturnValue(false);

      registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
        mock: { calls: unknown[][] };
      };
      const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

      listener({ uri: { fsPath: '/workspace/src/app.ts' } });
      vi.advanceTimersByTime(600);

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
        filePath: '/workspace/src/app.ts',
      });
    });
});

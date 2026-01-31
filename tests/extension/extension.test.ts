import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Import after mock is set up
import { activate, deactivate } from '../../src/extension/index';

describe('Extension', () => {
  let mockContext: {
    subscriptions: { dispose: () => void }[];
    extensionUri: { fsPath: string; path: string };
    workspaceState: {
      get: <T>(_key: string) => T | undefined;
      update: (_key: string, _value: unknown) => Thenable<void>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };
  });

  describe('activate', () => {
    it('should register the webview view provider', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
        'codegraphy.graphView',
        expect.any(Object)
      );
    });

    it('should register the open command', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'codegraphy.open',
        expect.any(Function)
      );
    });

    it('should add subscriptions to context', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(mockContext.subscriptions.length).toBe(5); // view provider + 4 commands
    });
  });

  describe('deactivate', () => {
    it('should not throw', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});

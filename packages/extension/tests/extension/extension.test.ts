import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Import after mock is set up
import { activate, deactivate } from '../../src/extension/activate';

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
    it('does not expose a raw plugin registration path', () => {
      const api = activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(api).not.toHaveProperty('registerPlugin');
    });

    it('should register the webview view provider', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
        'codegraphy.graphView',
        expect.any(Object),
        { webviewOptions: { retainContextWhenHidden: true } }
      );
      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledTimes(1);
    });

    it('should register the open command', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'codegraphy.open',
        expect.any(Function)
      );
    });

    it('should register the export markdown command', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'codegraphy.exportMarkdown',
        expect.any(Function)
      );
    });

    it('should add subscriptions to context', () => {
      activate(mockContext as unknown as Parameters<typeof activate>[0]);

      // view provider (1) + config listener (1) + active editor listener (1)
      // + URI handler (1) + runtime bridge listener (1)
      // + cache update file events (4) + scheduler (1) + status bar (1)
      // + 14 commands (open, openInEditor, fitView, zoomIn, zoomOut, undo, redo, exportPng, exportSvg, exportJpeg, exportJson, exportMarkdown, clearCache, toggleDepthMode)
      expect(mockContext.subscriptions.length).toBe(29);
    });
  });

  describe('deactivate', () => {
    it('should not throw', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});

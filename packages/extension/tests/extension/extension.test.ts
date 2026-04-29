import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Import after mock is set up
import { activate, deactivate } from '../../src/extension/activate';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

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
        expect.any(Object),
        { webviewOptions: { retainContextWhenHidden: true } }
      );
      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
        'codegraphy.timelineView',
        expect.any(Object),
        { webviewOptions: { retainContextWhenHidden: true } }
      );
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

      // view providers (2) + config listener (1) + active editor listener (1) + save listener (1)
      // + file watcher events (2) + file watcher (1) + URI handler (1) + runtime bridge listener (1)
      // + 16 commands (open, openInEditor, fitView, zoomIn, zoomOut, undo, redo, exportPng, exportSvg, exportJpeg, exportJson, exportMarkdown, clearCache, toggleDepthMode, cycleLayout, toggleDimension)
      expect(mockContext.subscriptions.length).toBe(26);
    });

    it('should ignore workspace settings saves when deciding graph refresh', async () => {
      vi.useFakeTimers();

      activate(mockContext as unknown as Parameters<typeof activate>[0]);
      const provider = (
        vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls[0]?.[1] as GraphViewProvider;
      const refreshSpy = vi.spyOn(provider, 'refreshChangedFiles').mockResolvedValue();

      const saveListener = (vscode.workspace.onDidSaveTextDocument as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0]?.[0] as (document: { uri?: { fsPath?: string } }) => void;
      expect(saveListener).toBeTypeOf('function');

      saveListener({ uri: { fsPath: '/test/workspace/.vscode/settings.json' } });
      vi.advanceTimersByTime(600);

      expect(refreshSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should refresh graph on regular file saves', async () => {
      vi.useFakeTimers();

      activate(mockContext as unknown as Parameters<typeof activate>[0]);
      const provider = (
        vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls[0]?.[1] as GraphViewProvider;
      vi.spyOn(provider, 'isGraphOpen').mockReturnValue(true);
      const refreshChangedFilesSpy = vi.spyOn(provider, 'refreshChangedFiles').mockResolvedValue();

      const saveListener = (vscode.workspace.onDidSaveTextDocument as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0]?.[0] as (document: { uri?: { fsPath?: string } }) => void;
      expect(saveListener).toBeTypeOf('function');

      saveListener({ uri: { fsPath: '/test/workspace/src/app.ts' } });
      vi.advanceTimersByTime(600);

      expect(refreshChangedFilesSpy).toHaveBeenCalledTimes(1);
      expect(refreshChangedFilesSpy).toHaveBeenCalledWith(['/test/workspace/src/app.ts']);
      vi.useRealTimers();
    });
  });

  describe('deactivate', () => {
    it('should not throw', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});

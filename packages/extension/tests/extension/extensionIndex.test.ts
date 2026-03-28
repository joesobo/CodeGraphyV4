/**
 * @fileoverview Additional tests for extension/index.ts targeting surviving mutants.
 * Tests the API surface returned by activate() and the deactivate function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension/index';

describe('extension activate API', () => {
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

  it('returns an API object with getGraphData function', () => {
    const api = activate(mockContext as never);
    expect(typeof api.getGraphData).toBe('function');
  });

  it('returns an API object with sendToWebview function', () => {
    const api = activate(mockContext as never);
    expect(typeof api.sendToWebview).toBe('function');
  });

  it('returns an API object with onWebviewMessage function', () => {
    const api = activate(mockContext as never);
    expect(typeof api.onWebviewMessage).toBe('function');
  });

  it('returns an API object with registerPlugin function', () => {
    const api = activate(mockContext as never);
    expect(typeof api.registerPlugin).toBe('function');
  });

  it('registers the webview view provider with the correct viewType', () => {
    activate(mockContext as never);

    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      'codegraphy.graphView',
      expect.any(Object)
    );
  });

  it('registers configuration change listener', () => {
    activate(mockContext as never);

    expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
  });

  it('registers active editor change listener', () => {
    activate(mockContext as never);

    expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
  });

  it('registers save document listener', () => {
    activate(mockContext as never);

    expect(vscode.workspace.onDidSaveTextDocument).toHaveBeenCalled();
  });

  it('creates a file system watcher', () => {
    activate(mockContext as never);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
  });

  it('registers multiple commands', () => {
    activate(mockContext as never);

    const registerCommand = vscode.commands.registerCommand as ReturnType<typeof vi.fn>;
    const registeredIds = registerCommand.mock.calls.map((call: unknown[]) => call[0]);
    expect(registeredIds).toContain('codegraphy.open');
    expect(registeredIds).toContain('codegraphy.undo');
    expect(registeredIds).toContain('codegraphy.redo');
    expect(registeredIds).toContain('codegraphy.exportPng');
    expect(registeredIds).toContain('codegraphy.fitView');
  });
});

describe('extension deactivate', () => {
  it('is a callable function', () => {
    expect(typeof deactivate).toBe('function');
  });

  it('does not throw when called', () => {
    expect(() => deactivate()).not.toThrow();
  });

  it('returns undefined', () => {
    expect(deactivate()).toBeUndefined();
  });
});

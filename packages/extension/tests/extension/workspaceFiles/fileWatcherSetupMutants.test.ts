/**
 * @fileoverview Tests targeting surviving mutants in fileWatcherSetup.ts.
 *
 * Surviving mutants:
 * - L21:64 StringLiteral: "" (replace '/' with '')
 * - L29:61 ObjectLiteral: {} (event payload mutated to {})
 * - L46:11 ConditionalExpression: true (saveTimeout guard)
 * - L50:21 StringLiteral: "" (console.log message for save)
 * - L66:19 StringLiteral: "" (console.log message for create)
 * - L73:19 StringLiteral: "" (console.log message for delete)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

// Mock path module to control relative() return value
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    relative: vi.fn(actual.relative),
  };
});

import * as path from 'path';
import {
  registerEditorChangeHandler,
} from '../../../src/extension/workspaceFiles/editorSync';
import {
  registerFileWatcher,
  registerSaveHandler,
} from '../../../src/extension/workspaceFiles/refresh/watchers';

function captureEditorChangeListener(): (editor: unknown) => Promise<void> {
  let listener: ((editor: unknown) => Promise<void>) | undefined;
  vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((callback) => {
    listener = callback as (editor: unknown) => Promise<void>;
    return { dispose: vi.fn() } as unknown as vscode.Disposable;
  });
  return async (editor: unknown) => {
    if (!listener) {
      throw new Error('missing active editor listener');
    }

    await listener(editor);
  };
}

function makeProvider() {
  return {
    trackFileVisit: vi.fn().mockResolvedValue(undefined),
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

describe('fileWatcherSetup backslash normalization (L21 mutant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      vscode.window as unknown as {
        visibleTextEditors: unknown[];
      }
    ).visibleTextEditors = [];
  });

  it('replaces backslashes with forward slashes in relative paths', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    // Mock path.relative to return a path with backslashes (Windows-style)
    vi.mocked(path.relative).mockReturnValue('src\\utils\\helper.ts');
    const triggerEditorChange = captureEditorChangeListener();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    await triggerEditorChange({
      document: {
        uri: { scheme: 'file', fsPath: '/workspace/src/utils/helper.ts' },
      },
    });

    // If the '/' replacement string is mutated to '', backslashes would be removed instead
    // of replaced, resulting in 'srcutilshelper.ts' instead of 'src/utils/helper.ts'
    expect(provider.trackFileVisit).toHaveBeenCalledWith('src/utils/helper.ts');
    expect(provider.setFocusedFile).toHaveBeenCalledWith('src/utils/helper.ts');
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
      filePath: 'src/utils/helper.ts',
    });
  });
});

describe('fileWatcherSetup event payload shape (L29 mutant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      vscode.window as unknown as {
        visibleTextEditors: unknown[];
      }
    ).visibleTextEditors = [];
  });

  it('emits activeEditorChanged with filePath: undefined when editor is undefined', async () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();
    const triggerEditorChange = captureEditorChangeListener();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    await triggerEditorChange(undefined);
    vi.advanceTimersByTime(150);

    // Verify the payload contains the filePath key (not just an empty object)
    const emitCall = provider.emitEvent.mock.calls[0];
    expect(emitCall[0]).toBe('workspace:activeEditorChanged');
    expect(emitCall[1]).toHaveProperty('filePath');
    expect(emitCall[1].filePath).toBeUndefined();
  });
});

describe('fileWatcherSetup saveTimeout guard (L46 mutant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call clearTimeout on the first save when no previous timeout exists', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    // First save — saveTimeout is undefined, so clearTimeout should NOT be called
    listener({ uri: { fsPath: '/workspace/src/app.ts' } });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('calls clearTimeout on subsequent saves when a timeout is pending', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    // First save — sets saveTimeout
    listener({ uri: { fsPath: '/workspace/src/a.ts' } });
    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    // Second save — should call clearTimeout
    listener({ uri: { fsPath: '/workspace/src/b.ts' } });
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});

describe('fileWatcherSetup console.log messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs the correct message when a file is saved (L50 mutant)', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    listener({ uri: { fsPath: '/workspace/src/app.ts' } });
    vi.advanceTimersByTime(500);

    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File saved, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('logs the correct message when a file is created (L66 mutant)', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    let createListener: ((uri: { fsPath: string }) => void) | undefined;
    const mockOnDidCreate = vi.fn((cb: (uri: { fsPath: string }) => void) => {
      createListener = cb;
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: mockOnDidCreate,
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    createListener!({ fsPath: '/workspace/new-file.ts' });
    vi.advanceTimersByTime(500);

    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('logs the correct message when a file is deleted (L73 mutant)', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
    const mockOnDidDelete = vi.fn((cb: (uri: { fsPath: string }) => void) => {
      deleteListener = cb;
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: mockOnDidDelete,
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    deleteListener!({ fsPath: '/workspace/deleted-file.ts' });
    vi.advanceTimersByTime(500);

    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File deleted, refreshing graph');

    consoleSpy.mockRestore();
  });
});

describe('fileWatcherSetup glob pattern (createFileSystemWatcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates file system watcher with the **/* glob pattern', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
  });
});

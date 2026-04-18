import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  syncActiveEditor,
} from '../../../src/extension/workspaceFiles/editorSync';
import {
  cancelPendingFocusedFileClear,
  scheduleFocusedFileClear,
} from '../../../src/extension/workspaceFiles/focusedFileClear';
import { hasVisibleWorkspaceFileEditor } from '../../../src/extension/workspaceFiles/visibleEditor';

function makeProvider() {
  return {
    trackFileVisit: vi.fn().mockResolvedValue(undefined),
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

describe('workspaceFiles/focus', () => {
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

  it('detects visible workspace file editors by workspace-relative path', () => {
    expect(
      hasVisibleWorkspaceFileEditor(
        [{ uri: { fsPath: '/workspace' } } as never],
        [{ document: { uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' } } } as never],
      ),
    ).toBe(true);
    expect(
      hasVisibleWorkspaceFileEditor(
        [{ uri: { fsPath: '/workspace' } } as never],
        [{ document: { uri: { scheme: 'file', fsPath: '/outside/src/app.ts' } } } as never],
      ),
    ).toBe(false);
  });

  it('returns false when there is no workspace folder or when the editor is not a file', () => {
    expect(hasVisibleWorkspaceFileEditor(undefined, [])).toBe(false);
    expect(
      hasVisibleWorkspaceFileEditor(
        [{ uri: { fsPath: '/workspace' } } as never],
        [{ document: { uri: { scheme: 'untitled', fsPath: '/workspace/app' } } } as never],
      ),
    ).toBe(false);
  });

  it('returns false when a workspace folder is missing but a visible workspace file exists', () => {
    expect(
      hasVisibleWorkspaceFileEditor(undefined, [
        { document: { uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' } } } as never,
      ]),
    ).toBe(false);
  });

  it('returns false when visible text editors are unavailable', () => {
    expect(
      hasVisibleWorkspaceFileEditor([{ uri: { fsPath: '/workspace' } } as never], undefined),
    ).toBe(false);
  });

  it('tracks a visible workspace file editor and clears pending focus resets', async () => {
    const provider = makeProvider();
    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    await syncActiveEditor(provider as never, {
      document: {
        uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
      },
    } as never);

    expect(provider.trackFileVisit).toHaveBeenCalledWith('src/app.ts');
    expect(provider.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
      filePath: 'src/app.ts',
    });
  });

  it('schedules a focus clear when no editor is active and no workspace editor remains visible', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    scheduleFocusedFileClear(provider as never);
    vi.advanceTimersByTime(150);

    expect(provider.setFocusedFile).toHaveBeenCalledWith(undefined);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
      filePath: undefined,
    });
  });

  it('does not clear the focus when an active editor is still present', () => {
    vi.useFakeTimers();
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
        uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
      },
    };

    scheduleFocusedFileClear(provider as never);
    vi.advanceTimersByTime(150);

    expect(provider.setFocusedFile).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('does not clear the focus when a visible workspace file editor is still open', () => {
    vi.useFakeTimers();
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

    scheduleFocusedFileClear(provider as never);
    vi.advanceTimersByTime(150);

    expect(provider.setFocusedFile).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('cancels a pending focus clear and leaves clearTimeout untouched when none exists', () => {
    const provider = makeProvider();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    cancelPendingFocusedFileClear(provider as never);

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('keeps the focus when a visible workspace file editor is still open', async () => {
    vi.useFakeTimers();
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

    await syncActiveEditor(provider as never, undefined);
    vi.advanceTimersByTime(150);

    expect(provider.setFocusedFile).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });
});

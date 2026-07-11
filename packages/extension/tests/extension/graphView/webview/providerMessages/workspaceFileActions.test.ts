import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import * as vscodeRuntime from 'vscode';
import { ClipboardFilesState } from '../../../../../src/extension/actions/clipboardFiles/state';
import { createWorkspaceFileActions } from '../../../../../src/extension/graphView/webview/providerMessages/primaryActions/workspaceFileActions';

const workspaceUri = {
  fsPath: '/workspace',
  path: '/workspace',
  toString: () => 'file:///workspace',
} as vscode.Uri;

function createHarness(confirm: string | undefined = 'Move') {
  const clipboard = new ClipboardFilesState();
  const executeUndoAction = vi.fn(async () => undefined);
  const showWarningMessage = vi.fn(async () => confirm);
  const showTerminal = vi.fn();
  const createTerminal = vi.fn(() => ({ show: showTerminal }));
  const actions = createWorkspaceFileActions(
    { _analyzeAndSendData: vi.fn(async () => undefined) } as never,
    {
      workspace: { workspaceFolders: [{ uri: workspaceUri }] },
      window: { createTerminal, showWarningMessage },
      executeUndoAction,
    } as never,
    clipboard,
  );
  return {
    actions,
    clipboard,
    createTerminal,
    executeUndoAction,
    showTerminal,
    showWarningMessage,
  };
}

describe('providerMessages/primaryActions/workspaceFileActions', () => {
  it('opens an integrated terminal in the selected folder', async () => {
    const harness = createHarness();

    await harness.actions.openInTerminal('src/features');

    expect(harness.createTerminal).toHaveBeenCalledWith({
      cwd: expect.objectContaining({ fsPath: '/workspace/src/features' }),
    });
    expect(harness.showTerminal).toHaveBeenCalledOnce();
  });

  it('opens Find in Files with the selected folder included', async () => {
    const harness = createHarness();

    await harness.actions.findInFolder('src/features');

    expect(vscodeRuntime.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.findInFiles',
      { filesToInclude: 'src/features' },
    );
  });

  it('opens the selected files in the native diff editor', async () => {
    const harness = createHarness();

    await harness.actions.compareFiles('src/app.ts', 'src/next.ts');

    expect(vscodeRuntime.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.diff',
      expect.objectContaining({ fsPath: '/workspace/src/app.ts' }),
      expect.objectContaining({ fsPath: '/workspace/src/next.ts' }),
    );
  });

  it('stages copied paths and executes an undoable paste without confirmation', async () => {
    const harness = createHarness();

    await harness.actions.copyFiles(['src/a.ts']);
    await harness.actions.pasteFiles('dest');

    expect(harness.executeUndoAction).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Copy 1 item' }),
    );
    expect(harness.showWarningMessage).not.toHaveBeenCalled();
    expect(harness.clipboard.read()?.mode).toBe('copy');
  });

  it('confirms one multi-item cut paste and clears it only after execution', async () => {
    const harness = createHarness();

    await harness.actions.cutFiles(['src/a.ts', 'src/b.ts']);
    await harness.actions.pasteFiles('dest');

    expect(harness.showWarningMessage).toHaveBeenCalledOnce();
    expect(harness.showWarningMessage).toHaveBeenCalledWith(
      'Move 2 items to "dest"?',
      { modal: true },
      'Move',
    );
    expect(harness.executeUndoAction).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Move 2 items' }),
    );
    expect(harness.clipboard.read()).toBeUndefined();
  });

  it('keeps cut files staged when the move is cancelled', async () => {
    const harness = createHarness('Cancel');

    await harness.actions.cutFiles(['src/a.ts', 'src/b.ts']);
    await harness.actions.pasteFiles('dest');

    expect(harness.executeUndoAction).not.toHaveBeenCalled();
    expect(harness.clipboard.read()?.mode).toBe('cut');
  });
});

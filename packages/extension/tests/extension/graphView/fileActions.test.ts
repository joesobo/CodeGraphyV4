import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  addGraphViewExcludePatterns,
  createGraphViewFile,
  deleteGraphViewFiles,
} from '../../../src/extension/graphView/fileActions';

describe('graphView/fileActions', () => {
  it('runs the delete action after confirmation', async () => {
    const executeDeleteAction = vi.fn(async () => undefined);
    const showWarningMessage = vi.fn(async () => 'Delete');

    await deleteGraphViewFiles(['src/app.ts'], {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showWarningMessage,
      executeDeleteAction,
    });

    expect(showWarningMessage).toHaveBeenCalledWith(
      'Are you sure you want to delete "src/app.ts"?',
      { modal: true },
      'Delete',
    );
    expect(executeDeleteAction).toHaveBeenCalledWith(
      ['src/app.ts'],
      vscode.Uri.file('/workspace'),
    );
  });

  it('skips the delete action when confirmation is rejected', async () => {
    const executeDeleteAction = vi.fn(async () => undefined);

    await deleteGraphViewFiles(['src/app.ts', 'src/lib.ts'], {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showWarningMessage: vi.fn(async () => undefined),
      executeDeleteAction,
    });

    expect(executeDeleteAction).not.toHaveBeenCalled();
  });

  it('creates the file selected in the input box', async () => {
    const executeCreateAction = vi.fn(async () => undefined);
    const showInputBox = vi.fn(async () => 'newfile.ts');

    await createGraphViewFile('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox,
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter file name',
      placeHolder: 'newfile.ts',
      ignoreFocusOut: true,
    });
    expect(executeCreateAction).toHaveBeenCalledWith(
      'src/newfile.ts',
      vscode.Uri.file('/workspace'),
    );
  });

  it('shows an error when creating the file fails', async () => {
    const showErrorMessage = vi.fn();

    await createGraphViewFile('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'newfile.ts'),
      executeCreateAction: vi.fn(async () => {
        throw new Error('disk full');
      }),
      showErrorMessage,
    });

    expect(showErrorMessage).toHaveBeenCalledWith('Failed to create file: disk full');
  });

  it('delegates exclude additions to the undoable action runner', async () => {
    const executeAddToExcludeAction = vi.fn(async () => undefined);

    await addGraphViewExcludePatterns(['dist/**'], {
      executeAddToExcludeAction,
    });

    expect(executeAddToExcludeAction).toHaveBeenCalledWith(['dist/**']);
  });
});

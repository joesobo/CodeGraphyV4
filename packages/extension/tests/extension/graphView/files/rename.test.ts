import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { renameGraphViewFile } from '../../../../src/extension/graphView/files/rename';

describe('graphView/files/rename', () => {
  it('does nothing when no workspace folder is available', async () => {
    const showInputBox = vi.fn(async () => 'renamed.ts');
    const executeRenameAction = vi.fn(async () => undefined);

    await renameGraphViewFile('src/original.ts', {
      showInputBox,
      executeRenameAction,
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).not.toHaveBeenCalled();
    expect(executeRenameAction).not.toHaveBeenCalled();
  });

  it('renames the file selected in the input box', async () => {
    const executeRenameAction = vi.fn(async () => undefined);
    const showInputBox = vi.fn(async () => 'renamed.ts');

    await renameGraphViewFile('src/original.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox,
      executeRenameAction,
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter new file name',
      value: 'original.ts',
      valueSelection: [0, 'original'.length],
      ignoreFocusOut: true,
    });
    expect(executeRenameAction).toHaveBeenCalledWith(
      'src/original.ts',
      'src/renamed.ts',
      vscode.Uri.file('/workspace'),
    );
  });

  it('selects the full hidden filename when there is no extension suffix to preserve', async () => {
    const showInputBox = vi.fn(async () => '.env.local');

    await renameGraphViewFile('src/.env', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox,
      executeRenameAction: vi.fn(async () => undefined),
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter new file name',
      value: '.env',
      valueSelection: [0, '.env'.length],
      ignoreFocusOut: true,
    });
  });

  it('does not rename when the user keeps the original name', async () => {
    const executeRenameAction = vi.fn(async () => undefined);

    await renameGraphViewFile('src/original.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'original.ts'),
      executeRenameAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeRenameAction).not.toHaveBeenCalled();
  });

  it('shows an error when the rename action fails', async () => {
    const showErrorMessage = vi.fn();

    await renameGraphViewFile('src/original.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'renamed.ts'),
      executeRenameAction: vi.fn(async () => {
        throw new Error('permission denied');
      }),
      showErrorMessage,
    });

    expect(showErrorMessage).toHaveBeenCalledWith('Failed to rename: permission denied');
  });
});

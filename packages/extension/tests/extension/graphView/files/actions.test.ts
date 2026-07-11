import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  addGraphViewExcludePatterns,
  createGraphViewFile,
  createGraphViewFolder,
  deleteGraphViewFiles,
} from '../../../../src/extension/graphView/files/actions';

describe('graphView/files/actions', () => {
  it.each([
    { confirmDelete: true, paths: ['src/app.ts'] },
    { confirmDelete: true, paths: ['src/app.ts', 'src/lib.ts'] },
    { confirmDelete: false, paths: ['src/app.ts'] },
    { confirmDelete: false, paths: ['src/app.ts', 'src/lib.ts'] },
  ])('honors explorer.confirmDelete=$confirmDelete for $paths.length target(s)', async ({
    confirmDelete,
    paths,
  }) => {
    const executeDeleteAction = vi.fn(async () => undefined);
    const showWarningMessage = vi.fn(async (): Promise<'Delete' | undefined> => 'Delete');

    await deleteGraphViewFiles(paths, {
      confirmDelete,
      disableDeleteConfirmation: vi.fn(async () => undefined),
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showWarningMessage,
      executeDeleteAction,
      useTrash: true,
    });

    expect(showWarningMessage).toHaveBeenCalledTimes(confirmDelete ? 1 : 0);
    expect(executeDeleteAction).toHaveBeenCalledWith(
      paths,
      vscode.Uri.file('/workspace'),
      true,
    );
  });

  it.each([
    { paths: ['src/app.ts'], useTrash: true },
    { paths: ['src/app.ts', 'src/lib.ts'], useTrash: true },
    { paths: ['src/app.ts'], useTrash: false },
    { paths: ['src/app.ts', 'src/lib.ts'], useTrash: false },
  ])('honors files.enableTrash=$useTrash for $paths.length target(s)', async ({
    paths,
    useTrash,
  }) => {
    const executeDeleteAction = vi.fn(async () => undefined);

    await deleteGraphViewFiles(paths, {
      confirmDelete: false,
      disableDeleteConfirmation: vi.fn(async () => undefined),
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showWarningMessage: vi.fn(async () => undefined),
      executeDeleteAction,
      useTrash,
    });

    expect(executeDeleteAction).toHaveBeenCalledWith(
      paths,
      vscode.Uri.file('/workspace'),
      useTrash,
    );
  });

  it('uses Explorer trash copy and persists Do not ask me again', async () => {
    const disableDeleteConfirmation = vi.fn(async () => undefined);
    const executeDeleteAction = vi.fn(async () => undefined);

    await deleteGraphViewFiles(['src/app.ts'], {
      confirmDelete: true,
      disableDeleteConfirmation,
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showWarningMessage: vi.fn(async () => 'Do not ask me again'),
      executeDeleteAction,
      useTrash: true,
    } as never);

    expect(disableDeleteConfirmation).toHaveBeenCalledOnce();
    expect(executeDeleteAction).toHaveBeenCalledOnce();
  });

  it('prompts but skips execution when no workspace folder is available for delete', async () => {
    const showWarningMessage = vi.fn(async (): Promise<'Delete' | undefined> => 'Delete');
    const executeDeleteAction = vi.fn(async () => undefined);

    await deleteGraphViewFiles(['src/app.ts'], {
      confirmDelete: true,
      disableDeleteConfirmation: vi.fn(async () => undefined),
      showWarningMessage,
      executeDeleteAction,
      useTrash: true,
    });

    expect(showWarningMessage).toHaveBeenCalledWith(
      'Are you sure you want to delete "src/app.ts"?',
      { detail: 'You can restore this file from the Trash.', modal: true },
      'Delete',
      'Do not ask me again',
    );
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

  it('creates files in the workspace root without prefixing the current directory', async () => {
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'newfile.ts'),
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateAction).toHaveBeenCalledWith(
      'newfile.ts',
      vscode.Uri.file('/workspace'),
    );
  });

  it('creates nested files below the selected directory', async () => {
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile('test', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'a/b/c/d.ts'),
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateAction).toHaveBeenCalledWith(
      'test/a/b/c/d.ts',
      vscode.Uri.file('/workspace'),
    );
  });

  it('trims nested file paths before executing create actions', async () => {
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => '  src/core/menuCreated.ts  '),
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateAction).toHaveBeenCalledWith(
      'src/core/menuCreated.ts',
      vscode.Uri.file('/workspace'),
    );
  });

  it.each([
    ['short root file', '.', 'a.ts', 'a.ts'],
    ['deep nested root file', '.', 'src/features/generated/deep/menuCreated.test.ts', 'src/features/generated/deep/menuCreated.test.ts'],
    ['long root file', '.', `${'generated-'.repeat(12)}folder/${'component-'.repeat(12)}view.tsx`, `${'generated-'.repeat(12)}folder/${'component-'.repeat(12)}view.tsx`],
    ['dotfile below selected folder', 'src', '.env.local', 'src/.env.local'],
    ['spaced file below selected folder', 'src/new menu', 'item [draft].ts', 'src/new menu/item [draft].ts'],
    ['nested file below selected folder', 'src', 'core/menuCreated.ts', 'src/core/menuCreated.ts'],
  ])('creates %s from the graph prompt', async (_label, directory, input, expectedPath) => {
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile(directory, {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => input),
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateAction).toHaveBeenCalledWith(
      expectedPath,
      vscode.Uri.file('/workspace'),
    );
  });

  it.each([
    ['../outside.ts'],
    ['components/../outside.ts'],
    ['/absolute.ts'],
    ['C:/outside.ts'],
    ['C:'],
    ['nested//file.ts'],
    ['nested/'],
    ['nested\\file.ts'],
    ['.'],
    ['..'],
    [''],
    ['   '],
    ['src/\u0000file.ts'],
    ['src/\nfile.ts'],
  ])('rejects unsafe file names from the create prompt: %j', async (fileName) => {
    const executeCreateAction = vi.fn(async () => undefined);
    const showErrorMessage = vi.fn();

    await createGraphViewFile('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => fileName),
      executeCreateAction,
      showErrorMessage,
    });

    expect(executeCreateAction).not.toHaveBeenCalled();
    expect(showErrorMessage).toHaveBeenCalledWith('Enter a relative file path inside this folder.');
  });

  it('creates the folder selected in the input box', async () => {
    const executeCreateFolderAction = vi.fn(async () => undefined);
    const showInputBox = vi.fn(async () => 'components');

    await createGraphViewFolder('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox,
      executeCreateFolderAction,
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter folder name',
      placeHolder: 'new-folder',
      ignoreFocusOut: true,
    });
    expect(executeCreateFolderAction).toHaveBeenCalledWith(
      'src/components',
      vscode.Uri.file('/workspace'),
    );
  });

  it('creates nested folders below the selected directory', async () => {
    const executeCreateFolderAction = vi.fn(async () => undefined);

    await createGraphViewFolder('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'components/forms'),
      executeCreateFolderAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateFolderAction).toHaveBeenCalledWith(
      'src/components/forms',
      vscode.Uri.file('/workspace'),
    );
  });

  it.each([
    ['short root folder', '.', 'a', 'a'],
    ['deep nested root folder', '.', 'src/features/generated/deep', 'src/features/generated/deep'],
    ['long root folder', '.', `${'generated-'.repeat(12)}folder/${'slice-'.repeat(12)}area`, `${'generated-'.repeat(12)}folder/${'slice-'.repeat(12)}area`],
    ['dotfolder below selected folder', 'src', '.storybook', 'src/.storybook'],
    ['spaced folder below selected folder', 'src/new menu', 'items [draft]', 'src/new menu/items [draft]'],
    ['nested folder below selected folder', 'src', 'features/generated', 'src/features/generated'],
  ])('creates %s from the graph prompt', async (_label, directory, input, expectedPath) => {
    const executeCreateFolderAction = vi.fn(async () => undefined);

    await createGraphViewFolder(directory, {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => input),
      executeCreateFolderAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateFolderAction).toHaveBeenCalledWith(
      expectedPath,
      vscode.Uri.file('/workspace'),
    );
  });

  it('trims nested folder paths before executing create actions', async () => {
    const executeCreateFolderAction = vi.fn(async () => undefined);

    await createGraphViewFolder('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => '  src/features/generated  '),
      executeCreateFolderAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateFolderAction).toHaveBeenCalledWith(
      'src/features/generated',
      vscode.Uri.file('/workspace'),
    );
  });

  it.each([
    ['../outside'],
    ['components/../outside'],
    ['/absolute'],
    ['C:/outside'],
    ['C:'],
    ['nested//folder'],
    ['nested/'],
    ['nested\\folder'],
    ['.'],
    ['..'],
    [''],
    ['   '],
    ['src/\u0000folder'],
    ['src/\nfolder'],
  ])('rejects unsafe folder names from the create prompt: %j', async (folderName) => {
    const executeCreateFolderAction = vi.fn(async () => undefined);
    const showErrorMessage = vi.fn();

    await createGraphViewFolder('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => folderName),
      executeCreateFolderAction,
      showErrorMessage,
    });

    expect(executeCreateFolderAction).not.toHaveBeenCalled();
    expect(showErrorMessage).toHaveBeenCalledWith('Enter a relative folder path inside this folder.');
  });

  it('returns before prompting when no workspace folder is available for create', async () => {
    const showInputBox = vi.fn(async () => 'newfile.ts');
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile('src', {
      showInputBox,
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(showInputBox).not.toHaveBeenCalled();
    expect(executeCreateAction).not.toHaveBeenCalled();
  });

  it('returns when the create prompt is cancelled', async () => {
    const executeCreateAction = vi.fn(async () => undefined);

    await createGraphViewFile('src', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => undefined),
      executeCreateAction,
      showErrorMessage: vi.fn(),
    });

    expect(executeCreateAction).not.toHaveBeenCalled();
  });

  it('stringifies non-error create failures', async () => {
    const showErrorMessage = vi.fn();

    await createGraphViewFile('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'newfile.ts'),
      executeCreateAction: vi.fn(async () => {
        throw 'disk full';
      }),
      showErrorMessage,
    });

    expect(showErrorMessage).toHaveBeenCalledWith('Failed to create file: disk full');
  });

  it('shows an error when creating the folder fails', async () => {
    const showErrorMessage = vi.fn();

    await createGraphViewFolder('.', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInputBox: vi.fn(async () => 'new-folder'),
      executeCreateFolderAction: vi.fn(async () => {
        throw new Error('disk full');
      }),
      showErrorMessage,
    });

    expect(showErrorMessage).toHaveBeenCalledWith('Failed to create folder: disk full');
  });

  it('delegates exclude additions to the undoable action runner', async () => {
    const executeAddToExcludeAction = vi.fn(async () => undefined);

    await addGraphViewExcludePatterns(['dist/**'], {
      executeAddToExcludeAction,
    });

    expect(executeAddToExcludeAction).toHaveBeenCalledWith(['dist/**']);
  });
});

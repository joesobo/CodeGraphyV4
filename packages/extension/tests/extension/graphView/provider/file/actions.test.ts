import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderFileActionMethods } from '../../../../../src/extension/graphView/provider/file/actions';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';

type MockUndoableAction = IUndoableAction & {
  analyzeAndSendData?: () => Promise<void>;
  sendFavorites?: () => void;
  type?: string;
};

function createUndoableAction(overrides: Partial<MockUndoableAction> = {}): MockUndoableAction {
  return {
    description: 'test action',
    execute: vi.fn(async () => undefined),
    undo: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('graphView/provider/file/actions', () => {
  afterEach(() => {
    vi.doUnmock('vscode');
    vi.doUnmock('../../../../../src/extension/graphView/provider/file/navigation');
    vi.doUnmock('../../../../../src/extension/graphView/files/actions');
    vi.doUnmock('../../../../../src/extension/graphView/files/rename');
    vi.doUnmock('../../../../../src/extension/graphView/favorites');
    vi.doUnmock('../../../../../src/extension/actions/deleteFiles');
    vi.doUnmock('../../../../../src/extension/actions/renameFile');
    vi.doUnmock('../../../../../src/extension/actions/createFile');
    vi.doUnmock('../../../../../src/extension/actions/toggleFavorite');
    vi.doUnmock('../../../../../src/extension/undoManager');
    vi.resetModules();
  });

  it('delegates file navigation helpers through their extracted provider wrappers', async () => {
    const openFile = vi.fn(async () => undefined);
    const revealFile = vi.fn(async () => undefined);
    const copyText = vi.fn(async () => undefined);
    const source = {
      _incrementVisitCount: vi.fn(async () => undefined),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendFavorites: vi.fn(),
    };
    const methods = createGraphViewProviderFileActionMethods(source as never, {
      openFile,
      revealFile,
      copyText,
      deleteFiles: vi.fn(async () => undefined),
      renameFile: vi.fn(async () => undefined),
      createFile: vi.fn(async () => undefined),
      toggleFavorites: vi.fn(async () => undefined),
      getWorkspaceFolder: vi.fn(),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showErrorMessage: vi.fn(),
      createDeleteAction: vi.fn(() => createUndoableAction()),
      createRenameAction: vi.fn(() => createUndoableAction()),
      createCreateAction: vi.fn(() => createUndoableAction()),
      createToggleFavoriteAction: vi.fn(() => createUndoableAction()),
      executeUndoAction: vi.fn(async () => undefined),
    });

    await methods._openFile('src/app.ts', { preview: true, preserveFocus: false });
    await methods._revealInExplorer('src/app.ts');
    await methods._copyToClipboard('hello');

    expect(openFile).toHaveBeenCalledWith(
      expect.objectContaining({
        _incrementVisitCount: expect.any(Function),
      }),
      'src/app.ts',
      {
        preview: true,
        preserveFocus: false,
      },
    );
    expect(revealFile).toHaveBeenCalledWith('src/app.ts');
    expect(copyText).toHaveBeenCalledWith('hello');
  });

  it('creates undoable file actions for delete, rename, and create operations', async () => {
    const executeUndoAction = vi.fn(async () => undefined);
    const createDeleteAction = vi.fn(() => createUndoableAction({ type: 'delete' }));
    const createRenameAction = vi.fn(() => createUndoableAction({ type: 'rename' }));
    const createCreateAction = vi.fn(() => createUndoableAction({ type: 'create' }));
    const deleteFiles = vi.fn(async (_paths, handlers) => {
      await handlers.executeDeleteAction(['src/app.ts'], { fsPath: '/workspace' });
    });
    const renameFile = vi.fn(async (_filePath, handlers) => {
      await handlers.executeRenameAction('src/app.ts', 'src/main.ts', { fsPath: '/workspace' });
    });
    const createFile = vi.fn(async (_directory, handlers) => {
      await handlers.executeCreateAction('src/new.ts', { fsPath: '/workspace' });
    });
    const source = {
      _incrementVisitCount: vi.fn(async () => undefined),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendFavorites: vi.fn(),
    };
    const methods = createGraphViewProviderFileActionMethods(source as never, {
      openFile: vi.fn(async () => undefined),
      revealFile: vi.fn(async () => undefined),
      copyText: vi.fn(async () => undefined),
      deleteFiles,
      renameFile,
      createFile,
      toggleFavorites: vi.fn(async () => undefined),
      getWorkspaceFolder: vi.fn(() => ({
        uri: { fsPath: '/workspace' },
        name: 'workspace',
        index: 0,
      } as never)),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showErrorMessage: vi.fn(),
      createDeleteAction,
      createRenameAction,
      createCreateAction,
      createToggleFavoriteAction: vi.fn(() => createUndoableAction()),
      executeUndoAction,
    });

    await methods._deleteFiles(['src/app.ts']);
    await methods._renameFile('src/app.ts');
    await methods._createFile('src');

    expect(createDeleteAction).toHaveBeenCalledWith(
      ['src/app.ts'],
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(createRenameAction).toHaveBeenCalledWith(
      'src/app.ts',
      'src/main.ts',
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(createCreateAction).toHaveBeenCalledWith(
      'src/new.ts',
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(executeUndoAction).toHaveBeenCalledTimes(3);
  });

  it('creates undoable favorite toggles that resync favorites after completion', async () => {
    const executeUndoAction = vi.fn(async () => undefined);
    const createToggleFavoriteAction = vi.fn((_paths, sendFavorites) => {
      sendFavorites();
      return createUndoableAction({ type: 'favorite' });
    });
    const toggleFavorites = vi.fn(async (_paths, handlers) => {
      await handlers.executeToggleFavoritesAction(['src/app.ts']);
    });
    const source = {
      _incrementVisitCount: vi.fn(async () => undefined),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendFavorites: vi.fn(),
    };
    const methods = createGraphViewProviderFileActionMethods(source as never, {
      openFile: vi.fn(async () => undefined),
      revealFile: vi.fn(async () => undefined),
      copyText: vi.fn(async () => undefined),
      deleteFiles: vi.fn(async () => undefined),
      renameFile: vi.fn(async () => undefined),
      createFile: vi.fn(async () => undefined),
      toggleFavorites,
      getWorkspaceFolder: vi.fn(),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showErrorMessage: vi.fn(),
      createDeleteAction: vi.fn(() => createUndoableAction()),
      createRenameAction: vi.fn(() => createUndoableAction()),
      createCreateAction: vi.fn(() => createUndoableAction()),
      createToggleFavoriteAction,
      executeUndoAction,
    });

    await methods._toggleFavorites(['src/app.ts']);

    expect(createToggleFavoriteAction).toHaveBeenCalledWith(
      ['src/app.ts'],
      expect.any(Function),
    );
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'favorite' }),
    );
  });

  it('uses the default open-file behavior when no behavior override is provided', async () => {
    const { methods, openFile } = await createDefaultDependencyHarness();

    await methods._openFile('src/app.ts');

    expect(openFile).toHaveBeenCalledWith(
      expect.objectContaining({
        _incrementVisitCount: expect.any(Function),
      }),
      'src/app.ts',
      {
        preview: false,
        preserveFocus: false,
      },
    );
  });

  it('passes the current workspace folder through default file-action delegates', async () => {
    const workspaceFolder = { uri: { fsPath: '/workspace' } };
    const { methods, deleteFiles } = await createDefaultDependencyHarness(workspaceFolder);

    await methods._deleteFiles(['src/app.ts']);

    expect(deleteFiles).toHaveBeenCalledOnce();
  });

  it('uses vscode confirmation and undo manager defaults for delete actions', async () => {
    const { source, methods, deleteFiles, showWarningMessage, DeleteFilesAction, execute } =
      await createDefaultDependencyHarness();

    await methods._deleteFiles(['src/app.ts']);

    expect(deleteFiles).toHaveBeenCalledOnce();
    expect(showWarningMessage).toHaveBeenCalledWith('Delete files?', { modal: true }, 'Delete');
    expect(DeleteFilesAction).toHaveBeenCalledWith(
      ['src/app.ts'],
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('uses vscode input and error defaults for rename actions', async () => {
    const { source, methods, showInputBox, showErrorMessage, RenameFileAction, execute } =
      await createDefaultDependencyHarness();

    await methods._renameFile('src/app.ts');

    expect(showInputBox).toHaveBeenCalledWith({ prompt: 'Rename file' });
    expect(showErrorMessage).toHaveBeenCalledWith('rename failed');
    expect(RenameFileAction).toHaveBeenCalledWith(
      'src/app.ts',
      'src/main.ts',
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('uses vscode input and error defaults for create actions', async () => {
    const { source, methods, showInputBox, showErrorMessage, CreateFileAction, execute } =
      await createDefaultDependencyHarness();

    await methods._createFile('src');

    expect(showInputBox).toHaveBeenCalledWith({ prompt: 'Create file' });
    expect(showErrorMessage).toHaveBeenCalledWith('create failed');
    expect(CreateFileAction).toHaveBeenCalledWith(
      'src/new.ts',
      { fsPath: '/workspace' },
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('uses the undo manager default for favorite toggles', async () => {
    const { source, methods, ToggleFavoriteAction, execute } = await createDefaultDependencyHarness();

    await methods._toggleFavorites(['src/app.ts']);

    expect(ToggleFavoriteAction).toHaveBeenCalledWith(['src/app.ts'], expect.any(Function));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(source._sendFavorites).toHaveBeenCalledOnce();
  });
});

async function createDefaultDependencyHarness(
  workspaceFolder: { uri: { fsPath: string } } | undefined = undefined,
) {
  vi.resetModules();

  const openFile = vi.fn(async () => undefined);
  const revealFile = vi.fn(async () => undefined);
  const copyText = vi.fn(async () => undefined);
  const deleteFiles = vi.fn(async (_paths: string[], handlers: {
    workspaceFolder: unknown;
    showWarningMessage(
      message: string,
      options: { modal: boolean },
      deleteAction: string,
    ): PromiseLike<string | undefined>;
    executeDeleteAction(paths: string[], workspaceFolderUri: { fsPath: string }): Promise<void>;
  }) => {
    expect(handlers.workspaceFolder).toEqual(workspaceFolder);
    await handlers.showWarningMessage('Delete files?', { modal: true }, 'Delete');
    await handlers.executeDeleteAction(['src/app.ts'], { fsPath: '/workspace' });
  });
  const renameFile = vi.fn(async (_filePath: string, handlers: {
    workspaceFolder: unknown;
    showInputBox(options: { prompt: string }): PromiseLike<string | undefined>;
    executeRenameAction(
      oldPath: string,
      newPath: string,
      workspaceFolderUri: { fsPath: string },
    ): Promise<void>;
    showErrorMessage(message: string): void;
  }) => {
    expect(handlers.workspaceFolder).toEqual(workspaceFolder);
    await handlers.showInputBox({ prompt: 'Rename file' });
    await handlers.executeRenameAction('src/app.ts', 'src/main.ts', { fsPath: '/workspace' });
    handlers.showErrorMessage('rename failed');
  });
  const createFile = vi.fn(async (_directory: string, handlers: {
    workspaceFolder: unknown;
    showInputBox(options: { prompt: string }): PromiseLike<string | undefined>;
    executeCreateAction(filePath: string, workspaceFolderUri: { fsPath: string }): Promise<void>;
    showErrorMessage(message: string): void;
  }) => {
    expect(handlers.workspaceFolder).toEqual(workspaceFolder);
    await handlers.showInputBox({ prompt: 'Create file' });
    await handlers.executeCreateAction('src/new.ts', { fsPath: '/workspace' });
    handlers.showErrorMessage('create failed');
  });
  const toggleFavorites = vi.fn(async (_paths: string[], handlers: {
    executeToggleFavoritesAction(paths: string[]): Promise<void>;
  }) => {
    await handlers.executeToggleFavoritesAction(['src/app.ts']);
  });
  const showWarningMessage = vi.fn(async () => 'Delete');
  const showInputBox = vi.fn(async () => 'result');
  const showErrorMessage = vi.fn();
  const execute = vi.fn(async (action: MockUndoableAction) => {
    await action.analyzeAndSendData?.();
    action.sendFavorites?.();
  });
  const DeleteFilesAction = vi.fn(function (
    this: MockUndoableAction,
    _paths: string[],
    _workspaceFolderUri: { fsPath: string },
    analyzeAndSendData: () => Promise<void>,
  ) {
    Object.defineProperty(this, 'description', { value: 'delete files', configurable: true });
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.analyzeAndSendData = analyzeAndSendData;
  });
  const RenameFileAction = vi.fn(function (
    this: MockUndoableAction,
    _oldPath: string,
    _newPath: string,
    _workspaceFolderUri: { fsPath: string },
    analyzeAndSendData: () => Promise<void>,
  ) {
    Object.defineProperty(this, 'description', { value: 'rename file', configurable: true });
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.analyzeAndSendData = analyzeAndSendData;
  });
  const CreateFileAction = vi.fn(function (
    this: MockUndoableAction,
    _filePath: string,
    _workspaceFolderUri: { fsPath: string },
    analyzeAndSendData: () => Promise<void>,
  ) {
    Object.defineProperty(this, 'description', { value: 'create file', configurable: true });
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.analyzeAndSendData = analyzeAndSendData;
  });
  const ToggleFavoriteAction = vi.fn(function (
    this: MockUndoableAction,
    _paths: string[],
    sendFavorites: () => void,
  ) {
    Object.defineProperty(this, 'description', { value: 'toggle favorites', configurable: true });
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.sendFavorites = sendFavorites;
  });

  vi.doMock('vscode', () => ({
    workspace: {
      workspaceFolders: workspaceFolder === undefined ? undefined : [workspaceFolder],
    },
    window: {
      showWarningMessage,
      showInputBox,
      showErrorMessage,
    },
  }));
  vi.doMock('../../../../../src/extension/graphView/provider/file/navigation', () => ({
    openGraphViewProviderFile: openFile,
    revealGraphViewProviderFileInExplorer: revealFile,
    copyGraphViewProviderTextToClipboard: copyText,
  }));
  vi.doMock('../../../../../src/extension/graphView/files/actions', () => ({
    createGraphViewFile: createFile,
    deleteGraphViewFiles: deleteFiles,
  }));
  vi.doMock('../../../../../src/extension/graphView/files/rename', () => ({
    renameGraphViewFile: renameFile,
  }));
  vi.doMock('../../../../../src/extension/graphView/favorites', () => ({
    toggleGraphViewFavorites: toggleFavorites,
  }));
  vi.doMock('../../../../../src/extension/actions/deleteFiles', () => ({
    DeleteFilesAction,
  }));
  vi.doMock('../../../../../src/extension/actions/renameFile', () => ({
    RenameFileAction,
  }));
  vi.doMock('../../../../../src/extension/actions/createFile', () => ({
    CreateFileAction,
  }));
  vi.doMock('../../../../../src/extension/actions/toggleFavorite', () => ({
    ToggleFavoriteAction,
  }));
  vi.doMock('../../../../../src/extension/undoManager', () => ({
    getUndoManager: () => ({ execute }),
  }));

  const { createGraphViewProviderFileActionMethods: createMethods } = await import(
    '../../../../../src/extension/graphView/provider/file/actions'
  );

  const source = {
    _incrementVisitCount: vi.fn(async () => undefined),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _sendFavorites: vi.fn(),
  };

  return {
    source,
    methods: createMethods(source as never),
    openFile,
    revealFile,
    copyText,
    deleteFiles,
    showWarningMessage,
    showInputBox,
    showErrorMessage,
    execute,
    DeleteFilesAction,
    RenameFileAction,
    CreateFileAction,
    ToggleFavoriteAction,
  };
}

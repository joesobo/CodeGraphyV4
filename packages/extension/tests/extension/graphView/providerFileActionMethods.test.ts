import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderFileActionMethods } from '../../../src/extension/graphView/providerFileActionMethods';

describe('graphView/providerFileActionMethods', () => {
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
      createDeleteAction: vi.fn(),
      createRenameAction: vi.fn(),
      createCreateAction: vi.fn(),
      createToggleFavoriteAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
    });

    await methods._openFile('src/app.ts', { preview: true, preserveFocus: false });
    await methods._revealInExplorer('src/app.ts');
    await methods._copyToClipboard('hello');

    expect(openFile).toHaveBeenCalledWith(source, 'src/app.ts', {
      preview: true,
      preserveFocus: false,
    });
    expect(revealFile).toHaveBeenCalledWith('src/app.ts');
    expect(copyText).toHaveBeenCalledWith('hello');
  });

  it('creates undoable file actions for delete, rename, and create operations', async () => {
    const executeUndoAction = vi.fn(async () => undefined);
    const createDeleteAction = vi.fn(() => ({ type: 'delete' }));
    const createRenameAction = vi.fn(() => ({ type: 'rename' }));
    const createCreateAction = vi.fn(() => ({ type: 'create' }));
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
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showErrorMessage: vi.fn(),
      createDeleteAction,
      createRenameAction,
      createCreateAction,
      createToggleFavoriteAction: vi.fn(),
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
      return { type: 'favorite' };
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
      createDeleteAction: vi.fn(),
      createRenameAction: vi.fn(),
      createCreateAction: vi.fn(),
      createToggleFavoriteAction,
      executeUndoAction,
    });

    await methods._toggleFavorites(['src/app.ts']);

    expect(createToggleFavoriteAction).toHaveBeenCalledWith(
      ['src/app.ts'],
      expect.any(Function),
    );
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith({ type: 'favorite' });
  });
});

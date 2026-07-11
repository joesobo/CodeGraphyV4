import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderFileActionMethods,
  type GraphViewProviderFileActionMethodDependencies,
  type GraphViewProviderFileActionMethodsSource,
} from '../../../../../src/extension/graphView/provider/file/actions';
import type {
  WorkspaceFileMutation,
  WorkspaceFileMutationContext,
} from '../../../../../src/extension/graphView/provider/file/mutations';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';

const WORKSPACE_URI = { fsPath: '/workspace' };

describe('graphView/provider/file/actions workspace mutations', () => {
  it('routes prompted renames through the prompt-free workspace mutation seam', async () => {
    const harness = createMutationRouteHarness({
      renameFile: async (_filePath, handlers) => {
        await handlers.executeRenameAction('src/app.ts', 'src/main.ts', WORKSPACE_URI as never);
      },
    });

    await harness.methods._renameFile('src/app.ts');

    expect(harness.executeWorkspaceFileMutation).toHaveBeenCalledWith(
      { kind: 'rename', oldPath: 'src/app.ts', newPath: 'src/main.ts' },
      {
        workspaceFolderUri: WORKSPACE_URI,
        refreshGraph: expect.any(Function),
        sendMessage: expect.any(Function),
      },
    );
    expect(harness.source.refreshChangedFiles).toHaveBeenCalledWith([
      'src/app.ts',
      'src/main.ts',
    ]);
  });

  it('routes confirmed deletes through the prompt-free workspace mutation seam', async () => {
    const harness = createMutationRouteHarness({
      deleteFiles: async (_paths, handlers) => {
        await handlers.executeDeleteAction(
          ['src/app.ts', 'src/main.ts'],
          WORKSPACE_URI as never,
          true,
        );
      },
    });

    await harness.methods._deleteFiles(['src/app.ts', 'src/main.ts']);

    expect(harness.executeWorkspaceFileMutation).toHaveBeenCalledWith(
      { kind: 'delete', paths: ['src/app.ts', 'src/main.ts'], useTrash: true },
      {
        workspaceFolderUri: WORKSPACE_URI,
        refreshGraph: expect.any(Function),
        sendMessage: expect.any(Function),
      },
    );
    expect(harness.source.refreshChangedFiles).toHaveBeenCalledWith([
      'src/app.ts',
      'src/main.ts',
    ]);
  });

  it('routes prompted creates through the prompt-free workspace mutation seam', async () => {
    const harness = createMutationRouteHarness({
      createFile: async (_directory, handlers) => {
        await handlers.executeCreateAction('src/new.ts', WORKSPACE_URI as never);
      },
    });

    await harness.methods._createFile('src');

    expect(harness.executeWorkspaceFileMutation).toHaveBeenCalledWith(
      { kind: 'create', filePath: 'src/new.ts' },
      {
        workspaceFolderUri: WORKSPACE_URI,
        refreshGraph: expect.any(Function),
        sendMessage: expect.any(Function),
      },
    );
    expect(harness.source.refreshChangedFiles).toHaveBeenCalledWith(['src/new.ts']);
  });

});

function createMutationRouteHarness(
  overrides: Partial<GraphViewProviderFileActionMethodDependencies>,
) {
  const source: GraphViewProviderFileActionMethodsSource = {
    _getFocusedFile: () => undefined,
    _analyzeAndSendData: vi.fn(async () => undefined),
    _sendFavorites: vi.fn(),
    _sendMessage: vi.fn(),
    refreshChangedFiles: vi.fn(async () => undefined),
    _setFocusedFile: vi.fn(),
  };
  const executeWorkspaceFileMutation = vi.fn(async (
    _mutation: WorkspaceFileMutation,
    context: WorkspaceFileMutationContext,
  ) => {
    await context.refreshGraph();
  });
  const action: IUndoableAction = {
    description: 'test action',
    execute: vi.fn(async () => undefined),
    undo: vi.fn(async () => undefined),
  };
  const dependencies: GraphViewProviderFileActionMethodDependencies = {
    openFile: vi.fn(async () => undefined),
    revealFile: vi.fn(async () => undefined),
    copyText: vi.fn(async () => undefined),
    deleteFiles: vi.fn(async () => undefined),
    renameFile: vi.fn(async () => undefined),
    createFile: vi.fn(async () => undefined),
    createFolder: vi.fn(async () => undefined),
    toggleFavorites: vi.fn(async () => undefined),
    getWorkspaceFolder: vi.fn(),
    showWarningMessage: vi.fn(async () => undefined),
    showInputBox: vi.fn(async () => undefined),
    showErrorMessage: vi.fn(),
    createCreateFolderAction: vi.fn(() => action),
    createToggleFavoriteAction: vi.fn(() => action),
    executeUndoAction: vi.fn(async () => undefined),
    executeWorkspaceFileMutation,
    ...overrides,
  };

  return {
    source,
    executeWorkspaceFileMutation,
    methods: createGraphViewProviderFileActionMethods(source, dependencies),
  };
}

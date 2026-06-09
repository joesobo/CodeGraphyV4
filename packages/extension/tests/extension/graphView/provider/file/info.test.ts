import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createGraphViewProviderFileInfoMethods } from '../../../../../src/extension/graphView/provider/file/info';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';

function createUndoableAction(overrides: Partial<IUndoableAction> = {}): IUndoableAction {
  return {
    description: 'test action',
    execute: vi.fn(async () => undefined),
    undo: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createSource() {
  return {
    _analyzer: {
      initialize: vi.fn(async () => undefined),
      getPluginNameForFile: vi.fn(() => undefined),
      getPluginNamesForIds: vi.fn(() => []),
    },
    _analyzerInitialized: false,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _sendMessage: vi.fn(),
    _analyzeAndSendData: vi.fn(async () => undefined),
  };
}

function createDependencies(overrides: Partial<Parameters<typeof createGraphViewProviderFileInfoMethods>[1]> = {}) {
  return {
    getWorkspaceFolder: vi.fn(() => ({
      uri: { fsPath: '/workspace' },
      name: 'workspace',
      index: 0,
    } as never)),
    getConfiguration: vi.fn(() => ({ get: vi.fn() })),
    statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
    sendFileInfoMessage: vi.fn(async () => undefined),
    sendFavorites: vi.fn(),
    addExcludeWithUndo: vi.fn(async () => undefined),
    createAddToExcludeAction: vi.fn(() => createUndoableAction()),
    executeUndoAction: vi.fn(async () => undefined),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/file/info', () => {
  it('loads file info and syncs analyzer initialization state', async () => {
    const source = createSource();
    const dependencies = createDependencies({
      sendFileInfoMessage: vi.fn(async (_filePath, state, handlers) => {
        await handlers.statFile({ fsPath: '/workspace/src/index.ts' } as never);
        handlers.sendMessage({ type: 'FILE_INFO_UPDATED' });
        handlers.logError('file info failed', 'boom');
        state.analyzerInitialized = true;
      }),
    });
    const methods = createGraphViewProviderFileInfoMethods(source as never, dependencies);

    await methods._getFileInfo('src/index.ts');

    expect(dependencies.sendFileInfoMessage).toHaveBeenCalledOnce();
    expect(dependencies.statFile).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(dependencies.logError).toHaveBeenCalledWith('file info failed', 'boom');
    expect(source._analyzerInitialized).toBe(true);
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'FILE_INFO_UPDATED' });
  });

  it('adds exclude patterns through undoable actions', async () => {
    const source = createSource();
    const action = createUndoableAction();
    const dependencies = createDependencies({
      addExcludeWithUndo: vi.fn(async (patterns, handlers) => {
        const createdAction = handlers.createAction(patterns, handlers.analyzeAndSendData);
        await handlers.executeAction(createdAction);
      }),
      createAddToExcludeAction: vi.fn(() => action),
    });
    const methods = createGraphViewProviderFileInfoMethods(source as never, dependencies);

    await methods._addToExclude(['dist/**']);

    expect(dependencies.addExcludeWithUndo).toHaveBeenCalledOnce();
    expect(dependencies.createAddToExcludeAction).toHaveBeenCalledWith(
      ['dist/**'],
      expect.any(Function),
    );
    expect(dependencies.executeUndoAction).toHaveBeenCalledWith(action);
  });

  it('sends favorites through the configured favorites dependency', () => {
    const source = createSource();
    const dependencies = createDependencies({
      sendFavorites: vi.fn((_config, sendMessage) => {
        sendMessage({ type: 'FAVORITES_UPDATED' });
      }),
    });
    const methods = createGraphViewProviderFileInfoMethods(source as never, dependencies);

    methods._sendFavorites();

    expect(dependencies.sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'FAVORITES_UPDATED' });
  });
});

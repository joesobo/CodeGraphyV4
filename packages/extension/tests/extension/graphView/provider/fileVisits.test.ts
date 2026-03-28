import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/contracts';
import { createGraphViewProviderFileVisitMethods } from '../../../../src/extension/graphView/provider/fileVisits';

describe('graphView/provider/fileVisits', () => {
  it('loads file info, prefers source visit overrides captured during creation, and syncs analyzer initialization state', async () => {
    const statFile = vi.fn(async () => ({ size: 1, mtime: 2 }));
    const logError = vi.fn();
    const getVisitCountOverride = vi.fn(() => 9);
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: {
        initialize: vi.fn(async () => undefined),
        getPluginNameForFile: vi.fn(() => undefined),
      },
      _analyzerInitialized: false,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getVisitCount: getVisitCountOverride,
    };
    const sendFileInfoMessage = vi.fn(async (_filePath, state, handlers) => {
      expect(handlers.getVisitCount('src/index.ts')).toBe(9);
      await handlers.statFile({ fsPath: '/workspace/src/index.ts' } as never);
      handlers.sendMessage({ type: 'FILE_INFO_UPDATED' });
      handlers.logError('file info failed', 'boom');
      state.analyzerInitialized = true;
    });
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile,
      sendFileInfoMessage,
      getVisitCount: vi.fn(() => 4),
      incrementVisitCount: vi.fn(async () => undefined),
      trackFileVisit: vi.fn(async () => undefined),
      sendFavorites: vi.fn(),
      addExcludeWithUndo: vi.fn(async () => undefined),
      createAddToExcludeAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
      logError,
    });

    await methods._getFileInfo('src/index.ts');

    expect(sendFileInfoMessage).toHaveBeenCalledOnce();
    expect(getVisitCountOverride).toHaveBeenCalledWith('src/index.ts');
    expect(statFile).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(logError).toHaveBeenCalledWith('file info failed', 'boom');
    expect(source._analyzerInitialized).toBe(true);
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'FILE_INFO_UPDATED' });
  });

  it('tracks visits, prefers source increment overrides captured during creation, and sends favorites', async () => {
    const incrementVisitCount = vi.fn(async (_filePath, handlers) => {
      handlers.sendMessage({ type: 'VISIT_COUNT_UPDATED' });
    });
    const trackFileVisit = vi.fn(async (_filePath, handlers) => {
      await handlers.incrementVisitCount('src/index.ts');
    });
    const sendFavorites = vi.fn((_config, sendMessage) => {
      sendMessage({ type: 'FAVORITES_UPDATED' });
    });
    const incrementVisitCountOverride = vi.fn(async () => undefined);
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: undefined,
      _analyzerInitialized: false,
      _graphData: { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _incrementVisitCount: incrementVisitCountOverride,
    };
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => undefined),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
      sendFileInfoMessage: vi.fn(async () => undefined),
      getVisitCount: vi.fn(() => 2),
      incrementVisitCount,
      trackFileVisit,
      sendFavorites,
      addExcludeWithUndo: vi.fn(async () => undefined),
      createAddToExcludeAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
      logError: vi.fn(),
    });

    expect(methods._getVisitCount('src/index.ts')).toBe(2);
    await methods._incrementVisitCount('src/index.ts');
    await methods.trackFileVisit('src/index.ts');
    methods._sendFavorites();

    expect(incrementVisitCount).toHaveBeenCalledOnce();
    expect(trackFileVisit).toHaveBeenCalledOnce();
    expect(incrementVisitCountOverride).toHaveBeenCalledWith('src/index.ts');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'VISIT_COUNT_UPDATED' });
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'FAVORITES_UPDATED' });
  });

  it('uses the generated visit-count and increment callbacks when no source overrides are installed', async () => {
    const getVisitCount = vi.fn(() => 4);
    const incrementVisitCount = vi.fn(async (_filePath, handlers) => {
      handlers.sendMessage({ type: 'VISIT_COUNT_UPDATED' });
    });
    const trackFileVisit = vi.fn(async (_filePath, handlers) => {
      await handlers.incrementVisitCount('src/index.ts');
    });
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: undefined,
      _analyzerInitialized: false,
      _graphData: { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
    };
    const sendFileInfoMessage = vi.fn(async (_filePath, _state, handlers) => {
      expect(handlers.getVisitCount('src/index.ts')).toBe(4);
    });
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => undefined),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
      sendFileInfoMessage,
      getVisitCount,
      incrementVisitCount,
      trackFileVisit,
      sendFavorites: vi.fn(),
      addExcludeWithUndo: vi.fn(async () => undefined),
      createAddToExcludeAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
      logError: vi.fn(),
    });

    await methods._getFileInfo('src/index.ts');
    await methods.trackFileVisit('src/index.ts');

    expect(getVisitCount).toHaveBeenCalledWith(source._context.workspaceState, 'src/index.ts');
    expect(incrementVisitCount).toHaveBeenCalledWith(
      'src/index.ts',
      expect.objectContaining({
        workspaceState: source._context.workspaceState,
        sendMessage: expect.any(Function),
      }),
    );
  });

  it('continues using the generated visit callbacks when no source overrides were captured', async () => {
    const getVisitCount = vi.fn(() => 5);
    const incrementVisitCount = vi.fn(async (_filePath, handlers) => {
      handlers.sendMessage({ type: 'VISIT_COUNT_UPDATED' });
    });
    const trackFileVisit = vi.fn(async (_filePath, handlers) => {
      await handlers.incrementVisitCount('src/index.ts');
    });
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: undefined,
      _analyzerInitialized: false,
      _graphData: { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
    };
    const sendFileInfoMessage = vi.fn(async (_filePath, _state, handlers) => {
      expect(handlers.getVisitCount('src/index.ts')).toBe(5);
    });
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => undefined),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
      sendFileInfoMessage,
      getVisitCount,
      incrementVisitCount,
      trackFileVisit,
      sendFavorites: vi.fn(),
      addExcludeWithUndo: vi.fn(async () => undefined),
      createAddToExcludeAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
      logError: vi.fn(),
    });

    await methods._getFileInfo('src/index.ts');
    await methods.trackFileVisit('src/index.ts');

    expect(getVisitCount).toHaveBeenCalledWith(source._context.workspaceState, 'src/index.ts');
    expect(incrementVisitCount).toHaveBeenCalledWith(
      'src/index.ts',
      expect.objectContaining({
        workspaceState: source._context.workspaceState,
        sendMessage: expect.any(Function),
      }),
    );
  });

  it('ignores method replacements that happen after creation', async () => {
    const getVisitCount = vi.fn(() => 6);
    const incrementVisitCount = vi.fn(async (_filePath, handlers) => {
      handlers.sendMessage({ type: 'VISIT_COUNT_UPDATED' });
    });
    const trackFileVisit = vi.fn(async (_filePath, handlers) => {
      await handlers.incrementVisitCount('src/index.ts');
    });
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: undefined,
      _analyzerInitialized: false,
      _graphData: { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
    };
    const sendFileInfoMessage = vi.fn(async (_filePath, _state, handlers) => {
      expect(handlers.getVisitCount('src/index.ts')).toBe(6);
    });
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => undefined),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
      sendFileInfoMessage,
      getVisitCount,
      incrementVisitCount,
      trackFileVisit,
      sendFavorites: vi.fn(),
      addExcludeWithUndo: vi.fn(async () => undefined),
      createAddToExcludeAction: vi.fn(),
      executeUndoAction: vi.fn(async () => undefined),
      logError: vi.fn(),
    });

    source._getVisitCount = vi.fn(() => 99);
    source._incrementVisitCount = vi.fn(async () => undefined);

    await methods._getFileInfo('src/index.ts');
    await methods.trackFileVisit('src/index.ts');

    expect(getVisitCount).toHaveBeenCalledWith(source._context.workspaceState, 'src/index.ts');
    expect(incrementVisitCount).toHaveBeenCalledWith(
      'src/index.ts',
      expect.objectContaining({
        workspaceState: source._context.workspaceState,
        sendMessage: expect.any(Function),
      }),
    );
  });

  it('adds exclude patterns through the undo helper', async () => {
    const addExcludeWithUndo = vi.fn(async (_patterns, handlers) => {
      await handlers.analyzeAndSendData();
      const action = handlers.createAction(['dist/**'], handlers.analyzeAndSendData);
      await handlers.executeAction(action);
    });
    const executeUndoAction = vi.fn(async () => undefined);
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _analyzer: undefined,
      _analyzerInitialized: false,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
    };
    const methods = createGraphViewProviderFileVisitMethods(source as never, {
      getWorkspaceFolder: vi.fn(() => undefined),
      getConfiguration: vi.fn(() => ({ get: vi.fn() })),
      statFile: vi.fn(async () => ({ size: 1, mtime: 2 })),
      sendFileInfoMessage: vi.fn(async () => undefined),
      getVisitCount: vi.fn(() => 0),
      incrementVisitCount: vi.fn(async () => undefined),
      trackFileVisit: vi.fn(async () => undefined),
      sendFavorites: vi.fn(),
      addExcludeWithUndo,
      createAddToExcludeAction: vi.fn(() => ({ kind: 'exclude-action' })),
      executeUndoAction,
      logError: vi.fn(),
    });

    await methods._addToExclude(['dist/**']);

    expect(addExcludeWithUndo).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith({ kind: 'exclude-action' });
  });
});

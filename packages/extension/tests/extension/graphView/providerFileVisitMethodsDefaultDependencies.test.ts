import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { uri: { fsPath: string } }[] | undefined = undefined;
  const configuration = { get: vi.fn((_: string, fallback: unknown) => fallback) };
  const undoExecute = vi.fn(async () => undefined);
  const getVisitCount = vi.fn(() => 7);
  const incrementVisitCount = vi.fn(async (_filePath, handlers) => {
    handlers.sendMessage({ type: 'VISIT_COUNT_UPDATED' });
  });
  const trackFileVisit = vi.fn(async (_filePath, handlers) => {
    await handlers.incrementVisitCount('src/index.ts');
  });
  const addExcludeWithUndo = vi.fn(async (patterns, handlers) => {
    await handlers.analyzeAndSendData();
    const action = handlers.createAction(patterns, handlers.analyzeAndSendData);
    await handlers.executeAction(action);
  });
  const addToExcludeAction = vi.fn(function MockAddToExcludeAction(this: Record<string, unknown>, patterns, analyzeAndSendData) {
    this.patterns = patterns;
    this.analyzeAndSendData = analyzeAndSendData;
  });

  return {
    get workspaceFolders(): { uri: { fsPath: string } }[] | undefined {
      return workspaceFolders;
    },
    set workspaceFolders(value: { uri: { fsPath: string } }[] | undefined) {
      workspaceFolders = value;
    },
    configuration,
    getConfiguration: vi.fn(() => configuration),
    stat: vi.fn(async () => ({ size: 1, mtime: 2 })),
    sendFileInfoMessage: vi.fn(),
    sendFavorites: vi.fn(),
    undoExecute,
    getVisitCount,
    incrementVisitCount,
    trackFileVisit,
    addExcludeWithUndo,
    addToExcludeAction,
  };
});

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
    getConfiguration: mocks.getConfiguration,
    fs: {
      stat: mocks.stat,
    },
  },
}));

vi.mock('../../../src/extension/graphView/fileInfoRequest', () => ({
  sendGraphViewProviderFileInfoMessage: mocks.sendFileInfoMessage,
}));

vi.mock('../../../src/extension/graphView/favorites', () => ({
  sendGraphViewFavorites: mocks.sendFavorites,
}));

vi.mock('../../../src/extension/graphView/visitTracking', () => ({
  getGraphViewVisitCount: mocks.getVisitCount,
  incrementGraphViewVisitCount: mocks.incrementVisitCount,
  trackGraphViewFileVisit: mocks.trackFileVisit,
}));

vi.mock('../../../src/extension/graphView/excludePatterns', () => ({
  addGraphViewExcludePatternsWithUndo: mocks.addExcludeWithUndo,
}));

vi.mock('../../../src/extension/UndoManager', () => ({
  getUndoManager: () => ({
    execute: mocks.undoExecute,
  }),
}));

vi.mock('../../../src/extension/actions', () => ({
  AddToExcludeAction: mocks.addToExcludeAction,
}));

import { createGraphViewProviderFileVisitMethods } from '../../../src/extension/graphView/providerFileVisitMethods';

describe('graphView/providerFileVisitMethods default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = undefined;
    mocks.configuration.get.mockClear();
    mocks.getConfiguration.mockClear();
    mocks.stat.mockClear();
    mocks.sendFileInfoMessage.mockReset();
    mocks.sendFavorites.mockReset();
    mocks.undoExecute.mockClear();
    mocks.getVisitCount.mockClear();
    mocks.incrementVisitCount.mockClear();
    mocks.trackFileVisit.mockClear();
    mocks.addExcludeWithUndo.mockClear();
    mocks.addToExcludeAction.mockClear();
  });

  it('passes the current workspace folder and default logError through file info requests', async () => {
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const workspaceFolder = { uri: { fsPath: '/workspace' } };
    mocks.workspaceFolders = [workspaceFolder];

    mocks.sendFileInfoMessage.mockImplementation(async (_filePath, _state, handlers) => {
      expect(handlers.workspaceFolder).toBe(workspaceFolder);
      await handlers.statFile({ fsPath: '/workspace/src/index.ts' });
      handlers.logError('file info failed', 'boom');
    });

    const methods = createGraphViewProviderFileVisitMethods(source as never);

    await methods._getFileInfo('src/index.ts');

    expect(mocks.stat).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(consoleError).toHaveBeenCalledWith('file info failed', 'boom');

    consoleError.mockRestore();
  });

  it('uses the default visit tracking dependencies when no overrides are installed', async () => {
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
    const methods = createGraphViewProviderFileVisitMethods(source as never);

    expect(methods._getVisitCount('src/index.ts')).toBe(7);

    await methods._incrementVisitCount('src/index.ts');
    await methods.trackFileVisit('src/index.ts');

    expect(mocks.getVisitCount).toHaveBeenCalledWith(source._context.workspaceState, 'src/index.ts');
    expect(mocks.incrementVisitCount).toHaveBeenCalledWith(
      'src/index.ts',
      expect.objectContaining({
        workspaceState: source._context.workspaceState,
        sendMessage: expect.any(Function),
      }),
    );
    expect(mocks.trackFileVisit).toHaveBeenCalledWith(
      'src/index.ts',
      expect.objectContaining({
        graphData: source._graphData,
        incrementVisitCount: expect.any(Function),
      }),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'VISIT_COUNT_UPDATED' });
  });

  it('uses the default exclude action and undo manager when adding exclude patterns', async () => {
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
    const methods = createGraphViewProviderFileVisitMethods(source as never);

    await methods._addToExclude(['dist/**']);

    expect(mocks.addExcludeWithUndo).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(mocks.addToExcludeAction).toHaveBeenCalledWith(['dist/**'], expect.any(Function));
    expect(mocks.undoExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        patterns: ['dist/**'],
        analyzeAndSendData: expect.any(Function),
      }),
    );
  });

  it('uses the default favorites configuration when sending favorites', () => {
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
    mocks.sendFavorites.mockImplementation((_configuration, sendMessage) => {
      expect(_configuration).toBe(mocks.configuration);
      sendMessage({ type: 'FAVORITES_UPDATED' });
    });

    const methods = createGraphViewProviderFileVisitMethods(source as never);

    methods._sendFavorites();

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'FAVORITES_UPDATED' });
  });
});

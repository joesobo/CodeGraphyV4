import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { uri: { fsPath: string } }[] | undefined = undefined;
  const configuration = { get: vi.fn((_: string, fallback: unknown) => fallback) };

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

import { createGraphViewProviderFileVisitMethods } from '../../../src/extension/graphView/providerFileVisitMethods';

describe('graphView/providerFileVisitMethods default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = undefined;
    mocks.configuration.get.mockClear();
    mocks.getConfiguration.mockClear();
    mocks.stat.mockClear();
    mocks.sendFileInfoMessage.mockReset();
    mocks.sendFavorites.mockReset();
  });

  it('passes an undefined workspace folder and default logError through file info requests', async () => {
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

    mocks.sendFileInfoMessage.mockImplementation(async (_filePath, _state, handlers) => {
      expect(handlers.workspaceFolder).toBeUndefined();
      await handlers.statFile({ fsPath: '/workspace/src/index.ts' });
      handlers.logError('file info failed', 'boom');
    });

    const methods = createGraphViewProviderFileVisitMethods(source as never);

    await methods._getFileInfo('src/index.ts');

    expect(mocks.stat).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(consoleError).toHaveBeenCalledWith('file info failed', 'boom');

    consoleError.mockRestore();
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

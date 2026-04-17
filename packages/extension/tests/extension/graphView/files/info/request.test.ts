import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { sendGraphViewProviderFileInfoMessage } from '../../../../../src/extension/graphView/files/info/request';

const workspaceFolder = {
  uri: { fsPath: '/workspace' },
  name: 'workspace',
  index: 0,
} as never;

describe('graph view file-info request helper', () => {
  it('initializes the analyzer on demand before loading and sending file info', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const state = {
      analyzer: {
        initialize: vi.fn(() => Promise.resolve()),
        getPluginNameForFile: vi.fn(() => undefined),
      },
      analyzerInitialized: false,
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      getVisitCount: vi.fn(() => 3),
      loadFileInfo: vi.fn(async (_filePath, options) => {
        await options.ensureAnalyzerReady();
        return {
          path: 'src/index.ts',
          visitCount: options.getVisitCount('src/index.ts'),
        };
      }),
      sendMessage,
      logError,
    });

    expect(state.analyzerInitialized).toBe(true);
    expect(state.analyzer?.initialize).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: {
        path: 'src/index.ts',
        visitCount: 3,
      },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('returns undefined analyzer state without trying to initialize it', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const state = {
      analyzer: undefined,
      analyzerInitialized: false,
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const loadFileInfo = vi.fn(async (_filePath, options) => ({
      analyzer: await options.ensureAnalyzerReady(),
    }));

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      getVisitCount: vi.fn(() => 3),
      loadFileInfo,
      sendMessage,
      logError,
    });

    expect(state.analyzerInitialized).toBe(false);
    expect(loadFileInfo).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: { analyzer: undefined },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('reuses an initialized analyzer without running initialize again', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const analyzer = {
      initialize: vi.fn(() => Promise.resolve()),
      getPluginNameForFile: vi.fn(() => undefined),
    };
    const state = {
      analyzer,
      analyzerInitialized: true,
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      getVisitCount: vi.fn(() => 3),
      loadFileInfo: vi.fn(async (_filePath, options) => ({
        analyzer: await options.ensureAnalyzerReady(),
      })),
      sendMessage,
      logError,
    });

    expect(analyzer.initialize).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: { analyzer },
    });
    expect(logError).not.toHaveBeenCalled();
  });
});

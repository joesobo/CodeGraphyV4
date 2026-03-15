import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import { sendGraphViewProviderFileInfoMessage } from '../../../src/extension/graphView/fileInfoRequest';

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
      workspaceFolder: { uri: { fsPath: '/workspace' } },
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
});

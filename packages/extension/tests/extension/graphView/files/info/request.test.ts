import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { sendGraphViewProviderFileInfoMessage } from '../../../../../src/extension/graphView/files/info/request';

const workspaceFolder = {
  uri: { fsPath: '/workspace' },
  name: 'workspace',
  index: 0,
} as never;

describe('graph view file-info request helper', () => {
  it('uses available plugin names without initializing the analyzer', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const state = {
      analyzer: {
        getPluginNamesForIds: vi.fn(() => ['TypeScript/JavaScript']),
      },
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      loadFileInfo: vi.fn(async (_filePath, options) => {
        return {
          path: 'src/index.ts',
          plugins: options.getPluginNamesForIds(['codegraphy.typescript']),
        };
      }),
      sendMessage,
      logError,
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: {
        path: 'src/index.ts',
        plugins: ['TypeScript/JavaScript'],
      },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('returns no plugin names when the analyzer is unavailable', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const state = {
      analyzer: undefined,
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const loadFileInfo = vi.fn(async (_filePath, options) => ({
      plugins: options.getPluginNamesForIds(['codegraphy.typescript']),
    }));

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      loadFileInfo,
      sendMessage,
      logError,
    });

    expect(loadFileInfo).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: { plugins: [] },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('reuses the current analyzer metadata', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();
    const analyzer = {
      getPluginNamesForIds: vi.fn(() => ['Markdown']),
    };
    const state = {
      analyzer,
      graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };

    await sendGraphViewProviderFileInfoMessage('src/index.ts', state, {
      workspaceFolder,
      statFile: vi.fn(),
      loadFileInfo: vi.fn(async (_filePath, options) => ({
        plugins: options.getPluginNamesForIds(['codegraphy.markdown']),
      })),
      sendMessage,
      logError,
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: { plugins: ['Markdown'] },
    });
    expect(logError).not.toHaveBeenCalled();
  });
});

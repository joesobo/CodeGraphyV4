import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const jsonHarness = vi.hoisted(() => ({ postMessage: vi.fn() }));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: jsonHarness.postMessage,
}));
vi.mock('../../../../src/webview/export/shared/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/export/shared/context')>();
  return { ...actual, createExportTimestamp: () => '2026-03-16T12-34-56' };
});

import { exportAsJson } from '../../../../src/webview/export/json/export';
import { graphStore } from '../../../../src/webview/store/state';

const initialStoreState = {
  legends: graphStore.getState().legends,
  pluginStatuses: graphStore.getState().pluginStatuses,
};

afterEach(() => {
  graphStore.setState(initialStoreState);
  jsonHarness.postMessage.mockReset();
  vi.restoreAllMocks();
});

describe('exportAsJson', () => {
  it('posts a timestamped json export message through the webview api', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    graphStore.setState({
      legends: [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }],
      pluginStatuses: [],
    });

    exportAsJson(data);

    expect(jsonHarness.postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_JSON',
      payload: {
        json: expect.any(String),
        filename: 'codegraphy-graph-2026-03-16T12-34-56.json',
      },
    });
    const message = jsonHarness.postMessage.mock.calls[0][0] as {
      payload: { json: string };
    };
    expect(JSON.parse(message.payload.json)).toEqual({
      format: 'codegraphy-export',
      version: '3.0',
      exportedAt: expect.any(String),
      scope: {
        graph: 'current-view',
      },
      summary: {
        totalNodes: 1,
        totalEdges: 0,
        totalLegendRules: 1,
        totalImages: 0,
      },
      legend: [
        {
          id: 'g1',
          pattern: '*.tsx',
          color: '#3B82F6',
          target: 'node',
        },
      ],
      nodes: [
        {
          id: 'src/App.tsx',
          label: 'App.tsx',
          nodeType: 'file',
          color: '#fff',
          legendIds: ['g1'],
        },
      ],
      edges: [],
    });
  });

  it('logs json export failures instead of throwing', () => {
    const error = new Error('json failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    jsonHarness.postMessage.mockImplementation(() => {
      throw error;
    });

    exportAsJson({ nodes: [], edges: [] });

    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] JSON export failed:', error);
});
});

import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  applyTimelineCommitGraph,
  buildTimelineCommitGraphData,
} from '../../../../../src/extension/graphView/timeline/provider/commitGraph';

describe('timeline commit graph', () => {
  function createGraphNode(id: string) {
    return { id, label: id, color: '#ffffff' };
  }

  it('builds the commit graph with the current timeline filters', async () => {
    const graphData = { nodes: [createGraphNode('src/index.ts')], edges: [] } satisfies IGraphData;
    const getGraphDataForCommit = vi.fn(async () => ({ nodes: [], edges: [] }));
    const buildTimelineGraphData = vi.fn(() => graphData);
    const source = {
      _analyzer: { registry: { kind: 'registry' } },
      _gitAnalyzer: { getGraphDataForCommit },
      _disabledPlugins: new Set(['plugin.test']),
    };

    await expect(buildTimelineCommitGraphData(source as never, 'sha-1', {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => false),
      buildTimelineGraphData,
    } as never)).resolves.toBe(graphData);

    expect(getGraphDataForCommit).toHaveBeenCalledWith('sha-1');
    expect(buildTimelineGraphData).toHaveBeenCalledWith(
      { nodes: [], edges: [] },
      {
        disabledPlugins: source._disabledPlugins,
        showOrphans: false,
        workspaceRoot: '/workspace',
        registry: source._analyzer.registry,
      },
    );
  });

  it('applies the commit graph through the current view transform', () => {
    const graphData = { nodes: [createGraphNode('src/index.ts')], edges: [] } satisfies IGraphData;
    const transformedGraph = { nodes: [createGraphNode('folder/src')], edges: [] } satisfies IGraphData;
    const applyViewTransform = vi.fn(function applyViewTransform(this: {
      _rawGraphData: IGraphData;
      _graphData: IGraphData;
    }) {
      expect(this._rawGraphData).toBe(graphData);
      this._graphData = transformedGraph;
    });
    const sendMessage = vi.fn();
    const source = {
      _currentCommitSha: undefined,
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: applyViewTransform,
      _sendMessage: sendMessage,
    };

    applyTimelineCommitGraph(source as never, 'sha-1', graphData);

    expect(source._currentCommitSha).toBe('sha-1');
    expect(source._rawGraphData).toBe(graphData);
    expect(source._graphData).toBe(transformedGraph);
    expect(applyViewTransform).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'sha-1', graphData: transformedGraph },
    } satisfies ExtensionToWebviewMessage);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { IGraphData, IGraphEdge } from '../../../../../src/shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  applyTimelineCommitGraph,
  buildTimelineCommitGraphData,
} from '../../../../../src/extension/graphView/timeline/provider/commitData';

describe('timeline commit data', () => {
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
      payload: {
        sha: 'sha-1',
        patch: {
          addedLinks: [],
          addedNodes: transformedGraph.nodes,
          removedLinkIds: [],
          removedNodeIds: [],
          updatedNodes: [],
        },
      },
    } satisfies ExtensionToWebviewMessage);
  });

  it('ships adjacent revision relation evidence in the same changed-slice patch', () => {
    const nodes = [createGraphNode('a'), createGraphNode('b')];
    const previousEdge: IGraphEdge = { id: 'old', from: 'a', to: 'b', kind: 'import', sources: [] };
    const nextEdge: IGraphEdge = { id: 'new', from: 'a', to: 'b', kind: 'call', sources: [] };
    const source = {
      _currentCommitSha: 'sha-1',
      _rawGraphData: { nodes, edges: [previousEdge] },
      _graphData: { nodes, edges: [previousEdge] },
      _applyViewTransform: undefined,
      _sendMessage: vi.fn(),
    };

    applyTimelineCommitGraph(source as never, 'sha-2', { nodes, edges: [nextEdge] });

    expect(source._graphData.edges).toEqual([
      nextEdge,
      expect.objectContaining({ id: 'revision-diff:added:new', kind: 'revision:diff' }),
      expect.objectContaining({ id: 'revision-diff:removed:old', kind: 'revision:diff' }),
    ]);
    expect(source._sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        sha: 'sha-2',
        patch: expect.objectContaining({
          addedLinks: expect.arrayContaining([
            nextEdge,
            expect.objectContaining({ id: 'revision-diff:added:new' }),
            expect.objectContaining({ id: 'revision-diff:removed:old' }),
          ]),
          removedLinkIds: ['old'],
        }),
      }),
    }));
  });

  it('bounds an adjacent revision payload to the changed slice', () => {
    const nodes = Array.from({ length: 200 }, (_, index) => createGraphNode(`src/file-${index}.ts`));
    const stableEdges = Array.from({ length: 198 }, (_, index) => ({
      id: `edge-${index}`,
      from: nodes[index]!.id,
      to: nodes[index + 1]!.id,
      kind: 'import' as const,
      sources: [],
    }));
    const previousGraph = {
      nodes,
      edges: [...stableEdges, {
        id: 'changed-edge',
        from: nodes[198]!.id,
        to: nodes[199]!.id,
        kind: 'import' as const,
        sources: [],
      }],
    };
    const nextGraph = {
      nodes,
      edges: [...stableEdges, {
        id: 'changed-edge',
        from: nodes[198]!.id,
        to: nodes[199]!.id,
        kind: 'call' as const,
        sources: [],
      }],
    };
    const sendMessage = vi.fn();
    const source = {
      _currentCommitSha: 'sha-1',
      _rawGraphData: previousGraph,
      _graphData: previousGraph,
      _applyViewTransform: undefined,
      _sendMessage: sendMessage,
    };

    applyTimelineCommitGraph(source as never, 'sha-2', nextGraph);

    const message = sendMessage.mock.calls[0]![0];
    const payloadBytes = Buffer.byteLength(JSON.stringify(message.payload));
    const fullGraphBytes = Buffer.byteLength(JSON.stringify(source._graphData));
    expect(payloadBytes).toBeLessThanOrEqual(2_560);
    expect(payloadBytes).toBeLessThan(fullGraphBytes);
  });
});

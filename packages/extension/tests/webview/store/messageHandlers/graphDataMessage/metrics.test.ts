import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { GraphNodeMetricsUpdateMessage } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/contracts';
import { handleGraphNodeMetricsUpdated } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/metrics';
import { createState } from '../graph/fixture';

describe('webview/store/messageHandlers/graphDataMessage/metrics', () => {
  it('ignores metric updates when there is no current state context', () => {
    expect(handleGraphNodeMetricsUpdated(createMetricsMessage([
      { id: 'src/app.ts', fileSize: 120, churn: 2 },
    ]))).toBeUndefined();
  });

  it('ignores metric updates when graph data has not arrived', () => {
    const state = createState({ graphData: null });

    expect(handleGraphNodeMetricsUpdated(
      createMetricsMessage([{ id: 'src/app.ts', fileSize: 120, churn: 2 }]),
      { getState: () => state },
    )).toBeUndefined();
  });

  it('applies metric updates in place when node sizing does not use metrics', () => {
    const graphData = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: false,
      graphData,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      isLoading: true,
      nodeSizeMode: 'connections',
    });

    const result = handleGraphNodeMetricsUpdated(
      createMetricsMessage([{ id: 'src/app.ts', fileSize: 120, churn: 2 }]),
      { getState: () => state },
    );

    expect(result).toEqual({
      isLoading: true,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
    expect(state.graphData).toBe(graphData);
    expect(graphData.nodes[0]).toMatchObject({ fileSize: 120, churn: 2 });
  });

  it('returns new graph data when metric sizing depends on changed node metrics', () => {
    const graphData = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      isLoading: true,
      nodeSizeMode: 'file-size',
    });

    const result = handleGraphNodeMetricsUpdated(
      createMetricsMessage([{ id: 'src/app.ts', fileSize: 120, churn: 1 }]),
      { getState: () => state },
    );

    expect(result).toEqual({
      graphData: {
        ...graphData,
        nodes: [
          { id: 'src/app.ts', label: 'App', color: '#94a3b8', fileSize: 120, churn: 1 },
          graphData.nodes[1],
        ],
      },
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
    expect(result?.graphData).not.toBe(graphData);
    expect(graphData.nodes[0]).toMatchObject({ fileSize: 100, churn: 1 });
  });

  it('settles indexing without replacing graph data when metric sizing values are unchanged', () => {
    const graphData = createGraphData();
    const state = createState({
      graphData,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      nodeSizeMode: 'churn',
    });

    expect(handleGraphNodeMetricsUpdated(
      createMetricsMessage([{ id: 'src/app.ts', fileSize: 100, churn: 1 }]),
      { getState: () => state },
    )).toEqual({
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('does not enter loading when bootstrap is incomplete but initial bootstrap is not pending', () => {
    const graphData = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: false,
      graphData,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      isLoading: false,
      nodeSizeMode: 'connections',
    });

    expect(handleGraphNodeMetricsUpdated(
      createMetricsMessage([{ id: 'src/app.ts', fileSize: 120, churn: 2 }]),
      { getState: () => state },
    )).toEqual({
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });
});

function createGraphData(): IGraphData {
  return {
    nodes: [
      { id: 'src/app.ts', label: 'App', color: '#94a3b8', fileSize: 100, churn: 1 },
      { id: 'src/lib.ts', label: 'Lib', color: '#94a3b8', fileSize: 50, churn: 3 },
    ],
    edges: [
      {
        id: 'src/app.ts->src/lib.ts#import',
        from: 'src/app.ts',
        to: 'src/lib.ts',
        kind: 'import',
        sources: [],
      },
    ],
  };
}

function createMetricsMessage(
  nodes: GraphNodeMetricsUpdateMessage['payload']['nodes'],
): GraphNodeMetricsUpdateMessage {
  return {
    type: 'GRAPH_NODE_METRICS_UPDATED',
    payload: { nodes },
  };
}

import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { handleGraphDataUpdated } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/payload';
import { createState } from '../graph/fixture';

describe('webview/store/messageHandlers/graphDataMessage/payload', () => {
  it('records received graph payload bytes through armed performance instrumentation', () => {
    const payload = createGraphData();
    const emitPayloadBytes = vi.fn();

    handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      undefined,
      emitPayloadBytes,
    );

    expect(emitPayloadBytes).toHaveBeenCalledWith(payload);
  });

  it('maps graph payload updates without requiring current state context', () => {
    const payload = createGraphData();

    expect(handleGraphDataUpdated({
      type: 'GRAPH_DATA_UPDATED',
      payload,
    })).toEqual({
      graphData: payload,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('skips duplicate graph payloads when duplicate-safe bootstrap state has settled', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData: cloneGraphData(payload),
      graphIsIndexing: false,
      isLoading: false,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toBeUndefined();
  });

  it('keeps loading while initial bootstrap is still waiting for app bootstrap completion', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: false,
      graphData: null,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      isLoading: true,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toEqual({
      graphData: payload,
      isLoading: true,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('settles initial bootstrap when graph data arrives after app bootstrap completes', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: true,
      graphData: null,
      graphIndexProgress: { phase: 'Updating Graph View', current: 1, total: 2 },
      graphIsIndexing: true,
      isLoading: true,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toEqual({
      graphData: payload,
      awaitingInitialBootstrap: false,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });
});

function createGraphData(): IGraphData {
  return {
    nodes: [{ id: 'src/app.ts', label: 'App', color: '#94a3b8' }],
    edges: [],
  };
}

function cloneGraphData(graphData: IGraphData): IGraphData {
  return JSON.parse(JSON.stringify(graphData)) as IGraphData;
}

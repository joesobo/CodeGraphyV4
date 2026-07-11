import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { handleGraphDataUpdated } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/payload';
import { createInlineRenameSession } from '../../../../../src/webview/components/graph/inlineEdit/model';
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
      ghostGraphVisible: false,
      pendingFileMutations: {},
      inlineEdit: null,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('records a valid full-graph revision', () => {
    expect(handleGraphDataUpdated({
      type: 'GRAPH_DATA_UPDATED',
      graphRevision: 7,
      payload: createGraphData(),
    })).toMatchObject({ graphRevision: 7 });
  });

  it('advances the reset version for a changed full graph', () => {
    const state = createState({
      graphData: { nodes: [], edges: [] },
      graphResetVersion: 2,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload: createGraphData() },
      { getState: () => state },
    )).toMatchObject({
      graphResetVersion: 3,
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

  it('advances the revision for an identical full graph replay', () => {
    const payload = createGraphData();
    const state = createState({
      graphRevision: 4,
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData: cloneGraphData(payload),
      graphIsIndexing: false,
      isLoading: false,
    });
    const graphData = state.graphData;

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', graphRevision: 7, payload },
      { getState: () => state },
    )).toEqual({ graphRevision: 7 });
    expect(state.graphData).toBe(graphData);
  });

  it('removes the ghost treatment when the live graph is identical', () => {
    const payload = createGraphData();
    const state = createState({
      bootstrapComplete: true,
      graphData: cloneGraphData(payload),
      ghostGraphVisible: true,
      isLoading: false,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toEqual({ ghostGraphVisible: false });
  });

  it('reconciles changed live data into the ghost layout without a reset', () => {
    const state = createState({
      bootstrapComplete: true,
      graphData: createGraphData(),
      ghostGraphVisible: true,
      graphResetVersion: 3,
      isLoading: false,
    });
    const payload: IGraphData = {
      nodes: [{ id: 'src/main.ts', label: 'Main', color: '#94a3b8' }],
      edges: [],
    };

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toMatchObject({
      ghostGraphVisible: false,
      graphData: payload,
      graphResetVersion: 3,
    });
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
      ghostGraphVisible: false,
      graphResetVersion: 1,
      pendingFileMutations: {},
      inlineEdit: null,
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
      ghostGraphVisible: false,
      graphResetVersion: 1,
      pendingFileMutations: {},
      inlineEdit: null,
      awaitingInitialBootstrap: false,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('preserves a recovered inline editor during rollback graph refresh', () => {
    const inlineEdit = {
      ...createInlineRenameSession('src/app.ts'),
      error: 'already exists',
      pending: false,
    };
    const state = createState({ graphData: createGraphData(), inlineEdit });
    const update = handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload: { ...createGraphData(), nodes: [] } },
      { getState: () => state },
    );
    expect(update).toMatchObject({ inlineEdit });
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

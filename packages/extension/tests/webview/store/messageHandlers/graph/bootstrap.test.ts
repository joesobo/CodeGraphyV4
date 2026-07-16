import { describe, expect, it } from 'vitest';
import {
  handleAppBootstrapComplete,
  handleGraphDataUpdated,
  handleGraphNodeMetricsUpdated,
} from '../../../../../src/webview/store/messageHandlers/graph';
import { createState } from './fixture';

describe('graph message handlers: bootstrap',()=>{
  it('maps graph payload updates into loading and indexing state', () => {
      const payload = { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] };
  
      expect(handleGraphDataUpdated({ type: 'GRAPH_DATA_UPDATED', payload })).toEqual({
        graphData: payload,
        isLoading: false,
        graphIsIndexing: false,
        graphIndexProgress: null,
      });
    });

  it('applies node metric patches to the current graph data', () => {
      const graphData = {
        nodes: [
          { id: 'src/app.ts', label: 'App', color: '#fff', fileSize: 100 },
          { id: 'src/lib.ts', label: 'Lib', color: '#fff', fileSize: 50 },
        ],
        edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
      };
      const state = createState({
        graphData,
        graphIsIndexing: true,
        graphIndexProgress: { phase: 'Updating Graph View', current: 0, total: 1 },
        isLoading: false,
        nodeSizeMode: 'file-size',
      });
  
      expect(handleGraphNodeMetricsUpdated(
        {
          type: 'GRAPH_NODE_METRICS_UPDATED',
          payload: {
            nodes: [{ id: 'src/app.ts', fileSize: 120 }],
          },
        },
        { getState: () => state },
      )).toEqual({
        graphData: {
          nodes: [
            { id: 'src/app.ts', label: 'App', color: '#fff', fileSize: 120 },
            graphData.nodes[1],
          ],
          edges: graphData.edges,
        },
        isLoading: false,
        graphIsIndexing: false,
        graphIndexProgress: null,
      });
    });

  it('keeps the graph data reference stable when metric patches do not affect node sizing', () => {
      const graphData = {
        nodes: [
          { id: 'src/app.ts', label: 'App', color: '#fff', fileSize: 100 },
          { id: 'src/lib.ts', label: 'Lib', color: '#fff', fileSize: 50 },
        ],
        edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
      };
      const state = createState({
        graphData,
        graphIsIndexing: true,
        graphIndexProgress: { phase: 'Updating Graph View', current: 0, total: 1 },
        isLoading: false,
        nodeSizeMode: 'connections',
      });
  
      expect(handleGraphNodeMetricsUpdated(
        {
          type: 'GRAPH_NODE_METRICS_UPDATED',
          payload: {
            nodes: [{ id: 'src/app.ts', fileSize: 120 }],
          },
        },
        { getState: () => state },
      )).toEqual({
        isLoading: false,
        graphIsIndexing: false,
        graphIndexProgress: null,
      });
  
      expect(state.graphData).toBe(graphData);
      expect(graphData.nodes[0]).toMatchObject({ fileSize: 120 });
    });

  it('skips duplicate graph payloads after bootstrap has settled', () => {
      const payload = {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }],
        edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
      };
      const state = createState({
        bootstrapComplete: true,
        graphData: JSON.parse(JSON.stringify(payload)),
        graphIsIndexing: false,
        isLoading: false,
      });
  
      expect(handleGraphDataUpdated(
        { type: 'GRAPH_DATA_UPDATED', payload },
        { getState: () => state },
      )).toBeUndefined();
    });

  it('skips duplicate graph payloads while waiting for initial bootstrap completion', () => {
      const payload = {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }],
        edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
      };
      const state = createState({
        awaitingInitialBootstrap: true,
        bootstrapComplete: false,
        graphData: JSON.parse(JSON.stringify(payload)),
        graphIsIndexing: false,
        isLoading: true,
      });
  
      expect(handleGraphDataUpdated(
        { type: 'GRAPH_DATA_UPDATED', payload },
        { getState: () => state },
      )).toBeUndefined();
    });

  it('settles initial bootstrap when graph data arrives after bootstrap and plugin assets are ready', () => {
      const payload = { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] };
      const state = createState({
        awaitingInitialBootstrap: true,
        bootstrapComplete: true,
        pendingPluginAssetLoads: 0,
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

  it('settles initial bootstrap when app bootstrap completes after graph data and plugin assets are ready', () => {
      const state = createState({
        graphData: { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] },
        awaitingInitialBootstrap: true,
        pendingPluginAssetLoads: 0,
        isLoading: true,
      });
  
      expect(handleAppBootstrapComplete(
        { type: 'APP_BOOTSTRAP_COMPLETE' },
        { getState: () => state },
      )).toEqual({
        bootstrapComplete: true,
        awaitingInitialBootstrap: false,
        isLoading: false,
      });
    });

  it('settles initial bootstrap when graph data and app bootstrap are ready while plugin assets continue loading', () => {
      const state = createState({
        graphData: { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] },
        awaitingInitialBootstrap: true,
        pendingPluginAssetLoads: 1,
        isLoading: true,
      });
  
      expect(handleAppBootstrapComplete(
        { type: 'APP_BOOTSTRAP_COMPLETE' },
        { getState: () => state },
      )).toEqual({
        bootstrapComplete: true,
        awaitingInitialBootstrap: false,
        isLoading: false,
      });
    });
});

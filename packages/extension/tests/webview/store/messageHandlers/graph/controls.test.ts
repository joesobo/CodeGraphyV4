import { describe, expect, it } from 'vitest';
import {
  handleFavoritesUpdated,
  handleGraphControlsUpdated,
  handleGraphIndexProgress,
  handleGraphIndexStatusUpdated,
} from '../../../../../src/webview/store/messageHandlers/graph';
import type { IGraphControlsSnapshot } from '../../../../../src/shared/graphControls/contracts';
import { createState } from './fixture';

describe('graph message handlers: controls',()=>{
  it('maps graph index status and progress payloads', () => {
      expect(handleGraphIndexStatusUpdated({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      })).toEqual({
        graphHasIndex: true,
        graphIndexFreshness: 'fresh',
        graphIndexDetail: 'CodeGraphy index is fresh.',
        graphIsIndexing: false,
        graphIndexProgress: null,
      });
  
      expect(handleGraphIndexProgress({
        type: 'GRAPH_INDEX_PROGRESS',
        payload: { phase: 'indexing', current: 2, total: 5 },
      })).toEqual({
        graphIsIndexing: true,
        graphIndexProgress: { phase: 'indexing', current: 2, total: 5 },
      });
    });

  it('maps graph controls and favorites payloads', () => {
      const controls: IGraphControlsSnapshot = {
        nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
        edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
        nodeColors: { file: '#A1A1AA' },
        nodeVisibility: { file: true },
        edgeVisibility: { import: false },
      };
  
      expect(handleGraphControlsUpdated({
        type: 'GRAPH_CONTROLS_UPDATED',
        payload: controls,
      })).toEqual({
        graphNodeTypes: controls.nodeTypes,
        graphEdgeTypes: controls.edgeTypes,
        nodeColors: controls.nodeColors,
        nodeVisibility: controls.nodeVisibility,
        edgeVisibility: controls.edgeVisibility,
      });
  
      const favorites = handleFavoritesUpdated({
        type: 'FAVORITES_UPDATED',
        payload: { favorites: ['src/app.ts', 'src/lib.ts'] },
      });
      expect([...favorites.favorites ?? []]).toEqual(['src/app.ts', 'src/lib.ts']);
  
    });

  it('skips graph controls updates when extension echoes the current controls', () => {
      const controls: IGraphControlsSnapshot = {
        nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
        edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
        nodeColors: { file: '#A1A1AA' },
        nodeVisibility: { file: true },
        edgeVisibility: { import: false },
      };
      const state = createState({
        graphNodeTypes: controls.nodeTypes,
        graphEdgeTypes: controls.edgeTypes,
        nodeColors: controls.nodeColors,
        nodeVisibility: controls.nodeVisibility,
        edgeVisibility: controls.edgeVisibility,
      });
      const echoedControls: IGraphControlsSnapshot = {
        nodeTypes: [...controls.nodeTypes],
        edgeTypes: [...controls.edgeTypes],
        nodeColors: { ...controls.nodeColors },
        nodeVisibility: { ...controls.nodeVisibility },
        edgeVisibility: { ...controls.edgeVisibility },
      };
  
      expect(handleGraphControlsUpdated(
        { type: 'GRAPH_CONTROLS_UPDATED', payload: echoedControls },
        { getState: () => state },
      )).toBeUndefined();
    });

  it('returns only changed graph control fields when extension echoes partial changes', () => {
      const controls: IGraphControlsSnapshot = {
        nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
        edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
        nodeColors: { file: '#A1A1AA' },
        nodeVisibility: { file: true },
        edgeVisibility: { import: false },
      };
      const state = createState({
        graphNodeTypes: controls.nodeTypes,
        graphEdgeTypes: controls.edgeTypes,
        nodeColors: controls.nodeColors,
        nodeVisibility: controls.nodeVisibility,
        edgeVisibility: controls.edgeVisibility,
      });
      const nextEdgeVisibility = { import: true };
      const echoedControls: IGraphControlsSnapshot = {
        nodeTypes: [...controls.nodeTypes],
        edgeTypes: [...controls.edgeTypes],
        nodeColors: { ...controls.nodeColors },
        nodeVisibility: { ...controls.nodeVisibility },
        edgeVisibility: nextEdgeVisibility,
      };
  
      expect(handleGraphControlsUpdated(
        { type: 'GRAPH_CONTROLS_UPDATED', payload: echoedControls },
        { getState: () => state },
      )).toEqual({ edgeVisibility: nextEdgeVisibility });
    });
});

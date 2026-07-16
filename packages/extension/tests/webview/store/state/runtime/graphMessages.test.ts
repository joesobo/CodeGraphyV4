import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphStore } from '../../../../../src/webview/store/state';
import { DEFAULT_DIRECTION_COLOR } from '../../../../../src/shared/fileColors';
import { clearSentMessages } from '../../../../helpers/sentMessages';

describe('GraphStore graph messages',()=>{
  let store: ReturnType<typeof createGraphStore>;
  beforeEach(()=>{ store=createGraphStore(); clearSentMessages(); });

  it('has correct initial state', () => {
      const state = store.getState();
      expect(state.graphData).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.searchQuery).toBe('');
      expect(state.favorites).toEqual(new Set());
      expect(state.directionMode).toBe('arrows');
      expect(state.directionColor).toBe(DEFAULT_DIRECTION_COLOR);
      expect(state.particleSpeed).toBe(0.005);
      expect(state.particleSize).toBe(4);
      expect(state.showLabels).toBe(true);
      expect(state.activePanel).toBe('none');
      expect(state.graphHasIndex).toBe(false);
      expect(state.graphViewContributionStatuses).toEqual([]);
    });

  it('handles GRAPH_DATA_UPDATED message', () => {
      const data = {
        nodes: [{ id: 'a.ts', label: 'a.ts', color: '#93C5FD' }],
        edges: [],
      };
      store.getState().handleExtensionMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: data,
      });
      expect(store.getState().graphData).toEqual(data);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().graphIsIndexing).toBe(false);
      expect(store.getState().graphIndexProgress).toBeNull();
    });

  it('handles GRAPH_INDEX_STATUS_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      });
  
      expect(store.getState().graphHasIndex).toBe(true);
      expect(store.getState().graphIndexFreshness).toBe('fresh');
    });

  it('clears graph indexing progress when the host reports a fresh index', () => {
      store.getState().handleExtensionMessage({
        type: 'GRAPH_INDEX_PROGRESS',
        payload: {
          phase: 'Saving Graph Cache',
          current: 96,
          total: 100,
        },
      });
  
      expect(store.getState().graphIsIndexing).toBe(true);
      expect(store.getState().graphIndexProgress).toEqual({
        phase: 'Saving Graph Cache',
        current: 96,
        total: 100,
      });
  
      store.getState().handleExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      });
  
      expect(store.getState().graphIsIndexing).toBe(false);
      expect(store.getState().graphIndexProgress).toBeNull();
    });

  it('handles FAVORITES_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'FAVORITES_UPDATED',
        payload: { favorites: ['src/a.ts', 'src/b.ts'] },
      });
      expect(store.getState().favorites).toEqual(new Set(['src/a.ts', 'src/b.ts']));
    });

  it('toggles favorites optimistically while waiting for the extension update', () => {
      store.getState().handleExtensionMessage({
        type: 'FAVORITES_UPDATED',
        payload: { favorites: ['src/a.ts'] },
      });
  
      store.getState().toggleFavoritesOptimistically(['src/a.ts', 'src/b.ts']);
  
      expect(store.getState().favorites).toEqual(new Set(['src/b.ts']));
    });

  it('ignores stale favorites updates while an optimistic favorite snapshot is pending', () => {
      store.getState().toggleFavoritesOptimistically(['src/index.ts']);
  
      store.getState().handleExtensionMessage({
        type: 'FAVORITES_UPDATED',
        payload: { favorites: [] },
      });
  
      expect(store.getState().favorites).toEqual(new Set(['src/index.ts']));
  
      store.getState().handleExtensionMessage({
        type: 'FAVORITES_UPDATED',
        payload: { favorites: ['src/index.ts'] },
      });
  
      expect(store.getState().favorites).toEqual(new Set(['src/index.ts']));
    });
});

import { describe, it, expect, vi } from 'vitest';
import { MESSAGE_HANDLERS, DAG_MODE_CYCLE } from '../../src/webview/storeMessages';
import type { IHandlerContext, IStoreFields } from '../../src/webview/storeMessages';
import type { ExtensionToWebviewMessage } from '../../src/shared/contracts';

function makeCtx(partial: Partial<IStoreFields> = {}): IHandlerContext {
  return {
    getState: () => ({
      graphData: null,
      isLoading: false,
      searchQuery: '',
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      favorites: new Set(),
      bidirectionalMode: 'separate',
      showOrphans: true,
      directionMode: 'arrows',
      directionColor: '#ffffff',
      particleSpeed: 0.005,
      particleSize: 4,
      showLabels: true,
      graphMode: '2d',
      nodeSizeMode: 'connections',
      physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
      depthLimit: 1,
      groups: [],
      filterPatterns: [],
      pluginFilterPatterns: [],
      availableViews: [],
      activeViewId: '',
      dagMode: null,
      folderNodeColor: '#ffffff',
      pluginStatuses: [],
      nodeDecorations: {},
      edgeDecorations: {},
      pluginContextMenuItems: [],
      activePanel: 'none',
      maxFiles: 500,
      timelineActive: false,
      timelineCommits: [],
      currentCommitSha: null,
      isIndexing: false,
      indexProgress: null,
      isPlaying: false,
      playbackSpeed: 1,
      ...partial,
    }),
    postMessage: vi.fn(),
  };
}

function msg<T extends ExtensionToWebviewMessage['type']>(
  type: T,
  payload: Extract<ExtensionToWebviewMessage, { type: T }> extends { payload: infer P } ? P : never,
): ExtensionToWebviewMessage {
  return { type, payload } as unknown as ExtensionToWebviewMessage;
}

describe('MESSAGE_HANDLERS', () => {
  it('GRAPH_DATA_UPDATED returns graph data and isLoading=false', () => {
    const data = { nodes: [], edges: [] };
    const result = MESSAGE_HANDLERS.GRAPH_DATA_UPDATED!(
      msg('GRAPH_DATA_UPDATED', data),
      makeCtx(),
    );
    expect(result).toEqual({ graphData: data, isLoading: false });
  });

  it('FAVORITES_UPDATED converts array to Set', () => {
    const result = MESSAGE_HANDLERS.FAVORITES_UPDATED!(
      msg('FAVORITES_UPDATED', { favorites: ['a.ts', 'b.ts'] }),
      makeCtx(),
    );
    expect(result).toEqual({ favorites: new Set(['a.ts', 'b.ts']) });
  });

  it('SETTINGS_UPDATED returns bidirectionalMode and showOrphans', () => {
    const result = MESSAGE_HANDLERS.SETTINGS_UPDATED!(
      msg('SETTINGS_UPDATED', { bidirectionalEdges: 'combined', showOrphans: false }),
      makeCtx(),
    );
    expect(result).toEqual({ bidirectionalMode: 'combined', showOrphans: false });
  });

  it('GROUPS_UPDATED returns groups', () => {
    const groups = [{ id: 'g1', pattern: '**', color: '#ff0' }];
    const result = MESSAGE_HANDLERS.GROUPS_UPDATED!(
      msg('GROUPS_UPDATED', { groups }),
      makeCtx(),
    );
    expect(result).toEqual({ groups });
  });

  it('FILTER_PATTERNS_UPDATED returns patterns and pluginPatterns', () => {
    const result = MESSAGE_HANDLERS.FILTER_PATTERNS_UPDATED!(
      msg('FILTER_PATTERNS_UPDATED', { patterns: ['src/**'], pluginPatterns: ['lib/**'] }),
      makeCtx(),
    );
    expect(result).toEqual({ filterPatterns: ['src/**'], pluginFilterPatterns: ['lib/**'] });
  });

  it('CACHE_INVALIDATED resets timeline fields', () => {
    const result = MESSAGE_HANDLERS.CACHE_INVALIDATED!(
      { type: 'CACHE_INVALIDATED', payload: null } as unknown as ExtensionToWebviewMessage,
      makeCtx(),
    );
    expect(result).toMatchObject({
      timelineActive: false,
      timelineCommits: [],
      currentCommitSha: null,
      isPlaying: false,
      isIndexing: false,
      indexProgress: null,
    });
  });

  it('PLAYBACK_ENDED sets isPlaying to false', () => {
    const result = MESSAGE_HANDLERS.PLAYBACK_ENDED!(
      { type: 'PLAYBACK_ENDED', payload: null } as unknown as ExtensionToWebviewMessage,
      makeCtx(),
    );
    expect(result).toEqual({ isPlaying: false });
  });

  it('TOGGLE_DIMENSION flips graphMode from 2d to 3d', () => {
    const ctx = makeCtx({ graphMode: '2d' });
    const result = MESSAGE_HANDLERS.TOGGLE_DIMENSION!(
      { type: 'TOGGLE_DIMENSION', payload: null } as unknown as ExtensionToWebviewMessage,
      ctx,
    );
    expect(result).toEqual({ graphMode: '3d' });
  });

  it('TOGGLE_DIMENSION flips graphMode from 3d to 2d', () => {
    const ctx = makeCtx({ graphMode: '3d' });
    const result = MESSAGE_HANDLERS.TOGGLE_DIMENSION!(
      { type: 'TOGGLE_DIMENSION', payload: null } as unknown as ExtensionToWebviewMessage,
      ctx,
    );
    expect(result).toEqual({ graphMode: '2d' });
  });

  it('CYCLE_VIEW posts CHANGE_VIEW with next view id', () => {
    const postMessage = vi.fn();
    const ctx = makeCtx({
      availableViews: [{ id: 'view1', label: 'V1' }, { id: 'view2', label: 'V2' }],
      activeViewId: 'view1',
    });
    ctx.postMessage = postMessage;

    MESSAGE_HANDLERS.CYCLE_VIEW!(
      { type: 'CYCLE_VIEW', payload: null } as unknown as ExtensionToWebviewMessage,
      ctx,
    );

    expect(postMessage).toHaveBeenCalledWith({ type: 'CHANGE_VIEW', payload: { viewId: 'view2' } });
  });

  it('CYCLE_VIEW does nothing when availableViews is empty', () => {
    const postMessage = vi.fn();
    const ctx = makeCtx({ availableViews: [] });
    ctx.postMessage = postMessage;

    MESSAGE_HANDLERS.CYCLE_VIEW!(
      { type: 'CYCLE_VIEW', payload: null } as unknown as ExtensionToWebviewMessage,
      ctx,
    );

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('CYCLE_LAYOUT advances through the dag mode cycle', () => {
    const postMessage = vi.fn();
    const ctx = makeCtx({ dagMode: null });
    ctx.postMessage = postMessage;

    MESSAGE_HANDLERS.CYCLE_LAYOUT!(
      { type: 'CYCLE_LAYOUT', payload: null } as unknown as ExtensionToWebviewMessage,
      ctx,
    );

    expect(postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_DAG_MODE',
      payload: { dagMode: DAG_MODE_CYCLE[1] },
    });
  });

  it('PLUGIN_WEBVIEW_INJECT returns undefined (no-op)', () => {
    const result = MESSAGE_HANDLERS.PLUGIN_WEBVIEW_INJECT!(
      { type: 'PLUGIN_WEBVIEW_INJECT', payload: { pluginId: 'test', scripts: [], styles: [] } } as unknown as ExtensionToWebviewMessage,
      makeCtx(),
    );
    expect(result).toBeUndefined();
  });
});

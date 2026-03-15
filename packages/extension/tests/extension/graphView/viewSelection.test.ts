import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import type { IViewContext } from '../../../src/core/views';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from '../../../src/extension/graphView/viewSelection';

describe('graph view selection helpers', () => {
  it('persists and broadcasts available view changes', async () => {
    const state = {
      _activeViewId: 'codegraphy.connections',
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _viewContext: { activePlugins: new Set(['plugin.alpha']) } satisfies IViewContext,
    };
    const persistActiveViewId = vi.fn(() => Promise.resolve());
    const applyViewTransform = vi.fn();
    const sendAvailableViews = vi.fn();
    const sendMessage = vi.fn();

    await changeGraphViewView(state, 'codegraphy.depth-graph', {
      isViewAvailable: () => true,
      persistActiveViewId,
      applyViewTransform,
      sendAvailableViews,
      sendMessage,
      logUnavailableView: vi.fn(),
    });

    expect(state._activeViewId).toBe('codegraphy.depth-graph');
    expect(persistActiveViewId).toHaveBeenCalledWith('codegraphy.depth-graph');
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendAvailableViews).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('updates focused file and re-sends graph data when depth view is active', () => {
    const state = {
      _activeViewId: 'codegraphy.depth-graph',
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _viewContext: {
        activePlugins: new Set(['plugin.alpha']),
        focusedFile: undefined,
      } satisfies IViewContext,
    };
    const applyViewTransform = vi.fn();
    const sendAvailableViews = vi.fn();
    const sendMessage = vi.fn();

    setGraphViewFocusedFile(state, 'src/app.ts', {
      getActiveViewInfo: () => ({ view: { id: 'codegraphy.depth-graph' } }),
      applyViewTransform,
      sendAvailableViews,
      sendMessage,
    });

    expect(state._viewContext.focusedFile).toBe('src/app.ts');
    expect(sendAvailableViews).toHaveBeenCalledTimes(1);
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('clamps depth limits, persists them, and re-sends graph data in depth view', async () => {
    const state = {
      _activeViewId: 'codegraphy.depth-graph',
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _viewContext: { activePlugins: new Set(), depthLimit: 1 } satisfies IViewContext,
    };
    const persistDepthLimit = vi.fn(() => Promise.resolve());
    const sendMessage = vi.fn();
    const applyViewTransform = vi.fn();

    await setGraphViewDepthLimit(state, 99, {
      persistDepthLimit,
      sendMessage,
      getActiveViewInfo: () => ({ view: { id: 'codegraphy.depth-graph' } }),
      applyViewTransform,
    });

    expect(state._viewContext.depthLimit).toBe(10);
    expect(persistDepthLimit).toHaveBeenCalledWith(10);
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 10 },
    });
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('returns the default depth limit when the view context does not set one', () => {
    expect(getGraphViewDepthLimit({ activePlugins: new Set() }, 1)).toBe(1);
  });
});

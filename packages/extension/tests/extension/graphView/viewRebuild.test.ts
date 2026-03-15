import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import {
  rebuildGraphViewData,
  smartRebuildGraphView,
} from '../../../src/extension/graphView/viewRebuild';

describe('graph view rebuild helpers', () => {
  it('rebuilds graph data and notifies dependents when analyzer state is available', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    const notifyGraphRebuild = vi.fn();
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => graphData),
        registry: { notifyGraphRebuild },
        getPluginStatuses: vi.fn(() => []),
      },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const updateViewContext = vi.fn();
    const applyViewTransform = vi.fn();
    const sendAvailableViews = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendDecorations = vi.fn();
    const sendMessage = vi.fn();

    rebuildGraphViewData(state, {
      getShowOrphans: () => false,
      updateViewContext,
      applyViewTransform,
      sendAvailableViews,
      sendPluginStatuses,
      sendDecorations,
      sendMessage,
    });

    expect(state._analyzer.rebuildGraph).toHaveBeenCalledWith(new Set(), new Set(), false);
    expect(state._rawGraphData).toEqual(graphData);
    expect(updateViewContext).toHaveBeenCalledTimes(1);
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendAvailableViews).toHaveBeenCalledTimes(1);
    expect(sendPluginStatuses).toHaveBeenCalledTimes(1);
    expect(sendDecorations).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(notifyGraphRebuild).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('sends plugin statuses directly when a toggle does not require a rebuild', () => {
    const state = {
      _analyzer: {
        getPluginStatuses: vi.fn(() => [{ id: 'plugin.alpha', enabled: false }]),
      },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
    };
    const rebuildAndSend = vi.fn();
    const sendMessage = vi.fn();

    smartRebuildGraphView(state, 'plugin', 'plugin.alpha', {
      shouldRebuild: () => false,
      rebuildAndSend,
      sendMessage,
    });

    expect(rebuildAndSend).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [{ id: 'plugin.alpha', enabled: false }] },
    });
  });
});

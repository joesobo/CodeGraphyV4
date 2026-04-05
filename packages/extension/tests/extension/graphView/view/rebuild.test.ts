import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
import {
  rebuildGraphViewData,
  smartRebuildGraphView,
} from '../../../../src/extension/graphView/view/rebuild';

describe('graphView/view/rebuild', () => {
  it('returns early when rebuild graph data is requested without an analyzer', () => {
    const state = {
      _analyzer: undefined,
      _disabledSources: new Set<string>(),
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
      getShowOrphans: () => true,
      updateViewContext,
      applyViewTransform,
      sendAvailableViews,
      sendPluginStatuses,
      sendDecorations,
      sendMessage,
    });

    expect(updateViewContext).not.toHaveBeenCalled();
    expect(applyViewTransform).not.toHaveBeenCalled();
    expect(sendAvailableViews).not.toHaveBeenCalled();
    expect(sendPluginStatuses).not.toHaveBeenCalled();
    expect(sendDecorations).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('rebuilds graph data and notifies dependents when analyzer state is available', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    const notifyGraphRebuild = vi.fn();
    const statuses: IPluginStatus[] = [];
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => graphData),
        registry: { notifyGraphRebuild },
        getPluginStatuses: vi.fn(() => statuses),
      },
      _disabledSources: new Set<string>(),
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
    const notifyGraphRebuild = vi.fn();
    const statuses = [
      {
        id: 'plugin.alpha',
        name: 'Alpha',
        version: '1.0.0',
        supportedExtensions: [],
        status: 'active' as const,
        enabled: false,
        connectionCount: 0,
        sources: [],
      },
    ] satisfies IPluginStatus[];
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
        registry: { notifyGraphRebuild },
        getPluginStatuses: vi.fn(() => statuses),
      },
      _disabledSources: new Set<string>(),
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
      payload: {
        plugins: [
          ...statuses,
        ],
      },
    });
  });

  it('returns early when a smart rebuild is requested without an analyzer', () => {
    const rebuildAndSend = vi.fn();
    const sendMessage = vi.fn();
    const shouldRebuild = vi.fn();

    smartRebuildGraphView(
      {
        _analyzer: undefined,
        _disabledSources: new Set<string>(),
        _disabledPlugins: new Set<string>(),
      },
      'rule',
      'rule.alpha',
      {
        shouldRebuild,
        rebuildAndSend,
        sendMessage,
      },
    );

    expect(shouldRebuild).not.toHaveBeenCalled();
    expect(rebuildAndSend).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('rebuilds graph data when a toggle requires a smart rebuild', () => {
    const statuses = [
      {
        id: 'plugin.alpha',
        name: 'Alpha',
        version: '1.0.0',
        supportedExtensions: [],
        status: 'active' as const,
        enabled: true,
        connectionCount: 0,
        sources: [],
      },
    ] satisfies IPluginStatus[];
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
        registry: { notifyGraphRebuild: vi.fn() },
        getPluginStatuses: vi.fn(() => statuses),
      },
      _disabledSources: new Set<string>(['rule.alpha']),
      _disabledPlugins: new Set<string>(['plugin.alpha']),
    };
    const shouldRebuild = vi.fn(() => true);
    const rebuildAndSend = vi.fn();
    const sendMessage = vi.fn();

    smartRebuildGraphView(state, 'plugin', 'plugin.alpha', {
      shouldRebuild,
      rebuildAndSend,
      sendMessage,
    });

    expect(state._analyzer.getPluginStatuses).toHaveBeenCalledWith(
      state._disabledSources,
      state._disabledPlugins,
    );
    expect(shouldRebuild).toHaveBeenCalledWith(statuses, 'plugin', 'plugin.alpha');
    expect(rebuildAndSend).toHaveBeenCalledOnce();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

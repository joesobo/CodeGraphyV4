import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import {
  rebuildGraphViewData,
  smartRebuildGraphView,
} from '../../../../src/extension/graphView/view/rebuild';

describe('graphView/view/rebuild', () => {
  it('returns early when rebuild graph data is requested without an analyzer', () => {
    const state = {
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const computeMergedGroups = vi.fn();
    const sendGroupsUpdated = vi.fn();
    const updateViewContext = vi.fn();
    const applyViewTransform = vi.fn();
    const sendDepthState = vi.fn();
    const sendGraphControls = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendDecorations = vi.fn();
    const sendMessage = vi.fn();

    rebuildGraphViewData(state, {
      getShowOrphans: () => true,
      computeMergedGroups,
      sendGroupsUpdated,
      updateViewContext,
      applyViewTransform,
      sendDepthState,
      sendGraphControls,
      sendPluginStatuses,
      sendDecorations,
      sendMessage,
    });

    expect(computeMergedGroups).not.toHaveBeenCalled();
    expect(sendGroupsUpdated).not.toHaveBeenCalled();
    expect(updateViewContext).not.toHaveBeenCalled();
    expect(applyViewTransform).not.toHaveBeenCalled();
    expect(sendDepthState).not.toHaveBeenCalled();
    expect(sendGraphControls).not.toHaveBeenCalled();
    expect(sendPluginStatuses).not.toHaveBeenCalled();
    expect(sendDecorations).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('rebuilds graph data and resends groups, controls, and dependents when analyzer state is available', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    const notifyGraphRebuild = vi.fn();
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => graphData),
        registry: { notifyGraphRebuild },
      },
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const computeMergedGroups = vi.fn();
    const sendGroupsUpdated = vi.fn();
    const updateViewContext = vi.fn();
    const applyViewTransform = vi.fn();
    const sendDepthState = vi.fn();
    const sendGraphControls = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendDecorations = vi.fn();
    const sendMessage = vi.fn();

    rebuildGraphViewData(state, {
      getShowOrphans: () => false,
      computeMergedGroups,
      sendGroupsUpdated,
      updateViewContext,
      applyViewTransform,
      sendDepthState,
      sendGraphControls,
      sendPluginStatuses,
      sendDecorations,
      sendMessage,
    });

    expect(state._analyzer.rebuildGraph).toHaveBeenCalledWith(new Set(), false);
    expect(state._rawGraphData).toEqual(graphData);
    expect(computeMergedGroups).toHaveBeenCalledTimes(1);
    expect(sendGroupsUpdated).toHaveBeenCalledTimes(1);
    expect(updateViewContext).toHaveBeenCalledTimes(1);
    expect(applyViewTransform).toHaveBeenCalledTimes(1);
    expect(sendDepthState).toHaveBeenCalledTimes(1);
    expect(sendGraphControls).toHaveBeenCalledTimes(1);
    expect(sendPluginStatuses).toHaveBeenCalledTimes(1);
    expect(sendDecorations).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(notifyGraphRebuild).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('recomputes legends after the rebuilt graph has been transformed', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'package.json', label: 'package.json', color: '#ffffff' }],
      edges: [],
    };
    const transformedGraphData: IGraphData = {
      nodes: [{ id: 'package.json', label: 'package.json', color: '#00AAFF' }],
      edges: [],
    };
    const state: {
      _analyzer: {
        rebuildGraph: ReturnType<typeof vi.fn>;
        registry: { notifyGraphRebuild: ReturnType<typeof vi.fn> };
      };
      _disabledPlugins: Set<string>;
      _rawGraphData: IGraphData;
      _graphData: IGraphData;
    } = {
      _analyzer: {
        rebuildGraph: vi.fn(() => rawGraphData),
        registry: { notifyGraphRebuild: vi.fn() },
      },
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    };
    const computeMergedGroups = vi.fn(() => {
      expect(state._graphData).toEqual(transformedGraphData);
    });
    const sendGroupsUpdated = vi.fn();
    const updateViewContext = vi.fn();
    const applyViewTransform = vi.fn(() => {
      state._graphData = transformedGraphData;
    });

    rebuildGraphViewData(state, {
      getShowOrphans: () => false,
      computeMergedGroups,
      sendGroupsUpdated,
      updateViewContext,
      applyViewTransform,
      sendDepthState: vi.fn(),
      sendGraphControls: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendMessage: vi.fn(),
    });

    expect(computeMergedGroups).toHaveBeenCalledOnce();
    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(computeMergedGroups.mock.invocationCallOrder[0]).toBeGreaterThan(
      applyViewTransform.mock.invocationCallOrder[0]!,
    );
    expect(sendGroupsUpdated.mock.invocationCallOrder[0]).toBeGreaterThan(
      computeMergedGroups.mock.invocationCallOrder[0]!,
    );
  });

  it('always rebuilds cached graph data for plugin toggles so legends and controls stay in sync', () => {
    const state = {
      _analyzer: {
        rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
        registry: { notifyGraphRebuild: vi.fn() },
      },
      _disabledPlugins: new Set<string>(),
    };
    const rebuildAndSend = vi.fn();

    smartRebuildGraphView(state, 'plugin.alpha', {
      rebuildAndSend,
    });

    expect(rebuildAndSend).toHaveBeenCalledOnce();
  });

  it('returns early when a smart rebuild is requested without an analyzer', () => {
    const rebuildAndSend = vi.fn();

    smartRebuildGraphView(
      {
        _analyzer: undefined,
        _disabledPlugins: new Set<string>(),
      },
      'rule.alpha',
      {
        rebuildAndSend,
      },
    );

    expect(rebuildAndSend).not.toHaveBeenCalled();
  });
});

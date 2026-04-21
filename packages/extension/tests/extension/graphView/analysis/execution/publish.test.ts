import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  publishAnalyzedGraph,
  publishAnalysisFailure,
  publishEmptyGraph,
} from '../../../../../src/extension/graphView/analysis/execution/publish';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution publish', () => {
  it('publishes an empty graph and index state', () => {
    const { handlers } = createExecutionHandlers();

    const graphData = publishEmptyGraph(handlers, true);

    expect(graphData).toEqual({ nodes: [], edges: [] });
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(true);
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
  });

  it('defaults empty graph publication to a missing index', () => {
    const { handlers } = createExecutionHandlers();

    publishEmptyGraph(handlers);

    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(false);
  });

  it('publishes the transformed graph and notifies post-analyze hooks', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const transformedGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        analyze: vi.fn(() => Promise.resolve(rawGraphData)),
      }),
    });
    const { handlers, getGraphData } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(transformedGraphData);
      }),
    });

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(handlers.updateViewContext).toHaveBeenCalledOnce();
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(transformedGraphData);
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(state.analyzer?.registry.notifyPostAnalyze).toHaveBeenCalledWith(getGraphData());
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(getGraphData());
  });

  it('recomputes and publishes legends after the transformed graph is available', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'package.json', label: 'package.json', color: '#ffffff' }],
      edges: [],
    };
    const transformedGraphData: IGraphData = {
      nodes: [{ id: 'package.json', label: 'package.json', color: '#00AAFF' }],
      edges: [],
    };
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
    });
    const computeMergedGroups = vi.fn(() => {
      expect(handlers.getGraphData()).toEqual(transformedGraphData);
    });
    const applyViewTransform = vi.fn(() => {
      handlers.setGraphData(transformedGraphData);
    });
    const sendGroupsUpdated = vi.fn();
    const { handlers } = createExecutionHandlers({
      computeMergedGroups,
      applyViewTransform,
      sendGroupsUpdated,
    });

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(computeMergedGroups).toHaveBeenCalledOnce();
    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(computeMergedGroups.mock.invocationCallOrder[0]).toBeGreaterThan(
      applyViewTransform.mock.invocationCallOrder[0]!,
    );
    expect(sendGroupsUpdated.mock.invocationCallOrder[0]).toBeGreaterThan(
      computeMergedGroups.mock.invocationCallOrder[0]!,
    );
  });

  it('publishes the transformed graph without post-analyze hooks when no analyzer is available', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState();
    const { handlers, getGraphData } = createExecutionHandlers();

    expect(() => publishAnalyzedGraph(state, handlers, rawGraphData, false)).not.toThrow();

    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(false);
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(getGraphData());
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(getGraphData());
  });

  it('publishes an empty graph fallback with plugin state updates after failures', () => {
    const { handlers } = createExecutionHandlers({
      sendPluginExporters: vi.fn(),
      sendPluginToolbarActions: vi.fn(),
    });

    publishAnalysisFailure(handlers);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendPluginExporters).toHaveBeenCalledOnce();
    expect(handlers.sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('publishes an empty graph fallback when optional plugin broadcasts are absent', () => {
    const { handlers } = createExecutionHandlers();

    expect(() => publishAnalysisFailure(handlers)).not.toThrow();

    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });
});

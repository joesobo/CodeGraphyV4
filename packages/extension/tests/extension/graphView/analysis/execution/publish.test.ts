import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
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
});

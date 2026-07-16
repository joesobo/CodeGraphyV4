import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';

import { publishAnalyzedGraph } from '../../../../../../src/extension/graphView/analysis/execution/publish';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from '../fixtures';

describe('graph view analysis incremental metric publication', () => {
  it('skips graph-specific publication when an incremental refresh leaves the raw graph unchanged', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [
        {
          id: 'src/index.ts->src/view.ts#import',
          from: 'src/index.ts',
          to: 'src/view.ts',
          kind: 'import',
          sources: [
            {
              id: 'typescript:src/index.ts->src/view.ts',
              pluginId: 'typescript',
              sourceId: 'src/index.ts->src/view.ts',
              label: 'TypeScript import',
            },
          ],
        },
      ],
    };
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: createExecutionAnalyzer(),
    });
    const sendPluginWebviewInjections = vi.fn();
    const { handlers, getGraphData } = createExecutionHandlers({
      sendPluginExporters: vi.fn(),
      sendPluginToolbarActions: vi.fn(),
      sendPluginWebviewInjections,
    });
    handlers.setRawGraphData(rawGraphData);
    handlers.setGraphData(rawGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.setGraphData).not.toHaveBeenCalled();
    expect(handlers.updateViewContext).not.toHaveBeenCalled();
    expect(handlers.applyViewTransform).not.toHaveBeenCalled();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).not.toHaveBeenCalled();
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(handlers.sendPluginExporters).toHaveBeenCalledOnce();
    expect(handlers.sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      true,
      'fresh',
      'CodeGraphy index is fresh.',
    );
    expect(state.analyzer?.registry.notifyPostAnalyze).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
  });

  it('skips group publication when an incremental refresh only changes node sizing metrics', () => {
    const currentGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 100,
      }],
      edges: [],
    };
    const nextGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 120,
      }],
      edges: [],
    };
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: createExecutionAnalyzer(),
    });
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith(nextGraphData);
    expect(handlers.updateViewContext).toHaveBeenCalledOnce();
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(nextGraphData);
  });

  it('sends node metric patches instead of full graph data for metric-only incremental refreshes', () => {
    const currentGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 100,
      }],
      edges: [],
    };
    const nextGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 120,
      }],
      edges: [],
    };
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['/workspace/src/index.ts'],
      analyzer: createExecutionAnalyzer(),
    });
    const sendGraphNodeMetricsUpdated = vi.fn();
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
      sendGraphNodeMetricsUpdated,
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(sendGraphNodeMetricsUpdated).toHaveBeenCalledWith([
      { id: 'src/index.ts', fileSize: 120 },
    ]);
    expect(handlers.sendGraphDataUpdated).not.toHaveBeenCalled();
  });

  it('skips static graph-state broadcasts for metric-only incremental patches', () => {
    const currentGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 100,
      }],
      edges: [],
    };
    const nextGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 120,
      }],
      edges: [],
    };
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['/workspace/src/index.ts'],
      analyzer: createExecutionAnalyzer(),
    });
    const sendGraphNodeMetricsUpdated = vi.fn();
    const sendPluginExporters = vi.fn();
    const sendPluginToolbarActions = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const { handlers, getGraphData } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
      sendGraphNodeMetricsUpdated,
      sendPluginExporters,
      sendPluginToolbarActions,
      sendPluginWebviewInjections,
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(sendGraphNodeMetricsUpdated).toHaveBeenCalledOnce();
    expect(handlers.sendDepthState).not.toHaveBeenCalled();
    expect(handlers.sendPluginStatuses).not.toHaveBeenCalled();
    expect(handlers.sendDecorations).not.toHaveBeenCalled();
    expect(handlers.sendContextMenuItems).not.toHaveBeenCalled();
    expect(sendPluginExporters).not.toHaveBeenCalled();
    expect(sendPluginToolbarActions).not.toHaveBeenCalled();
    expect(handlers.sendGraphViewContributionStatuses).not.toHaveBeenCalled();
    expect(sendPluginWebviewInjections).not.toHaveBeenCalled();
    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      true,
      'fresh',
      'CodeGraphy index is fresh.',
    );
    expect(state.analyzer?.registry.notifyPostAnalyze).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
  });
});

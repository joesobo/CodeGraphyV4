import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';

const performanceMocks = vi.hoisted(() => ({
  recordExtensionPerformanceEvent: vi.fn(),
}));

vi.mock('../../../../../src/extension/performance/marks', () => ({
  recordExtensionPerformanceEvent: performanceMocks.recordExtensionPerformanceEvent,
}));

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
  beforeEach(() => {
    performanceMocks.recordExtensionPerformanceEvent.mockReset();
  });

  it('publishes an empty graph and index state', () => {
    const { handlers } = createExecutionHandlers();

    const graphData = publishEmptyGraph(handlers, true);

    expect(graphData).toEqual({ nodes: [], edges: [] });
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      true,
      'fresh',
      'CodeGraphy index is fresh.',
    );
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
  });

  it('defaults empty graph publication to a missing index', () => {
    const { handlers } = createExecutionHandlers();

    publishEmptyGraph(handlers);

    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      false,
      'missing',
      'CodeGraphy index is missing. Index the workspace to build the graph.',
    );
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
      disabledPlugins: new Set(['plugin.disabled']),
      analyzer: createExecutionAnalyzer({
        analyze: vi.fn(() => Promise.resolve(rawGraphData)),
      }),
    });
    const sendPluginWebviewInjections = vi.fn();
    const { handlers, getGraphData } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(transformedGraphData);
      }),
      sendPluginWebviewInjections,
    });

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(handlers.updateViewContext).toHaveBeenCalledOnce();
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(transformedGraphData);
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(handlers.sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(state.analyzer?.registry.notifyPostAnalyze).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.setRawGraphData',
      expect.objectContaining({
        durationMs: expect.any(Number),
        rawEdgeCount: 0,
        rawNodeCount: 1,
      }),
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.viewTransform',
      expect.objectContaining({
        durationMs: expect.any(Number),
      }),
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.groups',
      expect.objectContaining({
        durationMs: expect.any(Number),
      }),
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.broadcasts',
      expect.objectContaining({
        durationMs: expect.any(Number),
      }),
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.getGraphData',
      expect.objectContaining({
        durationMs: expect.any(Number),
        edgeCount: 0,
        nodeCount: 1,
      }),
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.graph',
      {
        mode: 'analyze',
        rawNodeCount: 1,
        rawEdgeCount: 0,
        nodeCount: 1,
        edgeCount: 0,
        hasIndex: true,
        freshness: 'fresh',
      },
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.sendGraphData',
      expect.objectContaining({
        durationMs: expect.any(Number),
        edgeCount: 0,
        nodeCount: 1,
      }),
    );
  });

  it('reports graph view update progress before publishing an explicit index result', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const transformedGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState({
      mode: 'index',
      analyzer: createExecutionAnalyzer(),
    });
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(transformedGraphData);
      }),
    });
    const sendIndexProgress = vi.mocked(handlers.sendIndexProgress!);
    const sendGraphDataUpdated = vi.mocked(handlers.sendGraphDataUpdated);
    const sendGraphIndexStatusUpdated = vi.mocked(handlers.sendGraphIndexStatusUpdated);

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Updating Graph View',
      current: 0,
      total: 1,
    });
    expect(sendIndexProgress.mock.invocationCallOrder[0]).toBeLessThan(
      sendGraphDataUpdated.mock.invocationCallOrder[0]!,
    );
    expect(sendGraphIndexStatusUpdated.mock.invocationCallOrder[0]).toBeGreaterThan(
      sendGraphDataUpdated.mock.invocationCallOrder[0]!,
    );
  });

  it('publishes the actual missing index state when indexing does not create a Graph Cache', () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        getIndexStatus: vi.fn(() => ({
          freshness: 'missing' as const,
          detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
        })),
      }),
    });
    const { handlers } = createExecutionHandlers();

    publishAnalyzedGraph(state, handlers, rawGraphData, true);

    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      false,
      'missing',
      'CodeGraphy index is missing. Index the workspace to build the graph.',
    );
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
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.publish.unchangedGraph',
      expect.objectContaining({
        durationMs: expect.any(Number),
        edgeCount: 1,
        nodeCount: 1,
      }),
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

    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(
      false,
      'missing',
      'CodeGraphy index is missing. Index the workspace to build the graph.',
    );
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(getGraphData());
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(
      getGraphData(),
      state.disabledPlugins,
    );
  });

  it('publishes an empty graph fallback with plugin state updates after failures', () => {
    const sendPluginWebviewInjections = vi.fn();
    const { handlers } = createExecutionHandlers({
      sendPluginExporters: vi.fn(),
      sendPluginToolbarActions: vi.fn(),
      sendPluginWebviewInjections,
    });

    publishAnalysisFailure(handlers);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendPluginExporters).toHaveBeenCalledOnce();
    expect(handlers.sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(handlers.sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('publishes an empty graph fallback when optional plugin broadcasts are absent', () => {
    const { handlers } = createExecutionHandlers();

    expect(() => publishAnalysisFailure(handlers)).not.toThrow();

    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../src/shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
  GraphViewAnalysisMode,
} from '../../../../../../src/extension/graphView/analysis/execution';
import type { GraphPublicationPlan } from '../../../../../../src/extension/graphView/analysis/execution/publish/plan';
import {
  publishGraphDataMessage,
  publishRawGraphUpdate,
  publishStaticGraphMessages,
} from '../../../../../../src/extension/graphView/analysis/execution/publish/messages';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

function createEdge(overrides: Partial<IGraphEdge> = {}): IGraphEdge {
  return {
    id: 'src/a.ts->src/b.ts#import',
    from: 'src/a.ts',
    to: 'src/b.ts',
    kind: 'import',
    sources: [],
    ...overrides,
  };
}

function createGraph(overrides: Partial<IGraphData> = {}): IGraphData {
  return {
    nodes: [createNode()],
    edges: [createEdge()],
    ...overrides,
  };
}

function createState(mode: GraphViewAnalysisMode): GraphViewAnalysisExecutionState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    mode,
    filterPatterns: [],
    disabledPlugins: new Set(),
  };
}

function createHandlers(
  overrides: Partial<GraphViewAnalysisExecutionHandlers> = {},
): GraphViewAnalysisExecutionHandlers {
  return {
    setRawGraphData: vi.fn(),
    updateViewContext: vi.fn(),
    applyViewTransform: vi.fn(),
    computeMergedGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendDepthState: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendDecorations: vi.fn(),
    sendGraphDataUpdated: vi.fn(),
    isAnalysisStale: vi.fn(),
    hasWorkspace: vi.fn(),
    setGraphData: vi.fn(),
    getGraphData: vi.fn(),
    sendGraphIndexStatusUpdated: vi.fn(),
    markWorkspaceReady: vi.fn(),
    isAbortError: vi.fn(),
    logError: vi.fn(),
    ...overrides,
  } as GraphViewAnalysisExecutionHandlers;
}

function createPlan(overrides: Partial<GraphPublicationPlan> = {}): GraphPublicationPlan {
  return {
    currentRawGraphData: undefined,
    metricOnlyUpdate: undefined,
    reuseCurrentGraphPublication: false,
    shouldSendMetricPatch: false,
    ...overrides,
  };
}

describe('extension/graphView/analysis/execution/publish/messages', () => {
  it('skips raw graph publication when the current publication can be reused', () => {
    const handlers = createHandlers();

    publishRawGraphUpdate(
      createState('incremental'),
      handlers,
      createGraph(),
      createPlan({ reuseCurrentGraphPublication: true }),
    );

    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
  });

  it('publishes groups outside incremental mode even when group inputs match', () => {
    const currentGraph = createGraph();
    const handlers = createHandlers();

    publishRawGraphUpdate(
      createState('refresh'),
      handlers,
      createGraph(),
      createPlan({ currentRawGraphData: currentGraph }),
    );

    expect(handlers.setRawGraphData).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('skips group publication for unchanged incremental group inputs', () => {
    const currentGraph = createGraph();
    const handlers = createHandlers();

    publishRawGraphUpdate(
      createState('incremental'),
      handlers,
      createGraph(),
      createPlan({ currentRawGraphData: currentGraph }),
    );

    expect(handlers.setRawGraphData).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
  });

  it('publishes static graph messages without optional contribution broadcasters', () => {
    const handlers = createHandlers();

    expect(() => publishStaticGraphMessages(handlers)).not.toThrow();
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
  });

  it('sends metric patches instead of full graph data when the plan enables patches', () => {
    const sendGraphNodeMetricsUpdated = vi.fn();
    const handlers = createHandlers({ sendGraphNodeMetricsUpdated });
    const metricOnlyUpdate = [{ id: 'src/a.ts', fileSize: 15 }];

    publishGraphDataMessage(
      handlers,
      createGraph(),
      createPlan({ metricOnlyUpdate, shouldSendMetricPatch: true }),
    );

    expect(sendGraphNodeMetricsUpdated).toHaveBeenCalledWith(metricOnlyUpdate);
    expect(handlers.sendGraphDataUpdated).not.toHaveBeenCalled();
  });

  it('sends full graph data when metric patch updates are absent', () => {
    const sendGraphNodeMetricsUpdated = vi.fn();
    const handlers = createHandlers({ sendGraphNodeMetricsUpdated });
    const graphData = createGraph();

    publishGraphDataMessage(
      handlers,
      graphData,
      createPlan({ shouldSendMetricPatch: true }),
    );

    expect(sendGraphNodeMetricsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(graphData);
  });

  it('sends full graph data when metric patch publication is disabled', () => {
    const sendGraphNodeMetricsUpdated = vi.fn();
    const handlers = createHandlers({ sendGraphNodeMetricsUpdated });
    const graphData = createGraph();
    const metricOnlyUpdate = [{ id: 'src/a.ts', fileSize: 15 }];

    publishGraphDataMessage(
      handlers,
      graphData,
      createPlan({ metricOnlyUpdate, shouldSendMetricPatch: false }),
    );

    expect(sendGraphNodeMetricsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(graphData);
  });

  it('does not throw when an inconsistent metric patch plan lacks a sender', () => {
    expect(() => publishGraphDataMessage(
      createHandlers(),
      createGraph(),
      createPlan({
        metricOnlyUpdate: [{ id: 'src/a.ts', fileSize: 15 }],
        shouldSendMetricPatch: true,
      }),
    )).not.toThrow();
  });
});

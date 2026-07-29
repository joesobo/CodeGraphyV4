import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
} from '../../../../../../src/extension/graphView/analysis/execution';
import {
  publishGraphDataMessage,
  publishRawGraphUpdate,
  publishStaticGraphMessages,
} from '../../../../../../src/extension/graphView/analysis/execution/publish/messages';

function createGraph(): IGraphData {
  return {
    nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#67E8F9', nodeType: 'file' }],
    edges: [],
  };
}

function createHandlers(): GraphViewAnalysisExecutionHandlers {
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
  };
}

describe('extension/graphView/analysis/execution/publish/messages', () => {
  it('publishes raw graph and group state', () => {
    const handlers = createHandlers();
    const graph = createGraph();

    publishRawGraphUpdate(handlers, graph);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith(graph);
    expect(handlers.updateViewContext).toHaveBeenCalledOnce();
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('publishes static messages and full graph data', () => {
    const handlers = createHandlers();
    const graph = createGraph();

    publishStaticGraphMessages(handlers);
    publishGraphDataMessage(handlers, graph);

    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(graph);
  });
});

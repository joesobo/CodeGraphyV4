import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';

import {
  publishAnalyzedGraph,
  publishAnalysisFailure,
} from '../../../../../../src/extension/graphView/analysis/execution/publish';
import {
  createExecutionHandlers,
  createExecutionState,
} from '../fixtures';

describe('graph view analysis unavailable and failed publication', () => {
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
      sendPluginWebviewInjections,
    });

    publishAnalysisFailure(handlers);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
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

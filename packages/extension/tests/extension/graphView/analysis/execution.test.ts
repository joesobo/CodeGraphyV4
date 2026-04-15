import { describe, expect, it, vi } from 'vitest';
import { executeGraphViewAnalysis } from '../../../../src/extension/graphView/analysis/execution';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './execution/fixtures';

describe('graph view analysis execution', () => {
  it('logs non-abort analysis failures and publishes an empty graph fallback', async () => {
    const error = new Error('boom');
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        analyze: vi.fn(async () => {
          throw error;
        }),
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.logError).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', error);
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('returns quietly for abort errors raised during analysis', async () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        analyze: vi.fn(async () => {
          throw error;
        }),
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers({
      isAbortError: vi.fn(nextError => nextError === error),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.logError).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.sendPluginStatuses).not.toHaveBeenCalled();
    expect(handlers.markWorkspaceReady).not.toHaveBeenCalled();
  });
});

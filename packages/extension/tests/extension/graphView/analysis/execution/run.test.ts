import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { runGraphViewAnalysis } from '../../../../../src/extension/graphView/analysis/execution/run';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution run', () => {
  it('analyzes the workspace and publishes the transformed graph', async () => {
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
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(transformedGraphData);
      }),
    });

    await expect(
      runGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(true);

    expect(state.analyzer?.analyze).toHaveBeenCalledOnce();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(transformedGraphData);
    expect(handlers.sendGraphIndexStatusUpdated).toHaveBeenCalledWith(true);
  });

  it('drops analyzed graph results when the request turns stale after analyze resolves', async () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        analyze: vi.fn(async () => rawGraphData),
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn(() => true),
    });

    await expect(
      runGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).not.toHaveBeenCalled();
    expect(state.analyzer?.registry.notifyPostAnalyze).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  refreshGraphViewRawData,
} from '../../../../../src/extension/graphView/analysis/execution/refresh';
import {
  createExecutionAnalyzer,
  createExecutionState,
} from './fixtures';
import { EMPTY_GRAPH_DATA } from '../../../../../src/extension/graphView/analysis/execution/publish';

describe('graph view analysis execution refresh', () => {
  it('runs explicit full refresh through the analyzer refresh path', async () => {
    const refreshIndex = vi.fn(async () => ({ nodes: [], edges: [] }));
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: createExecutionAnalyzer({
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });

    await refreshGraphViewRawData(new AbortController().signal, state, vi.fn());

    expect(refreshIndex).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('preserves analyzer method context when running explicit full refresh', async () => {
    const graphData = {
      nodes: [{ id: 'src/index.ts', label: 'index.ts', color: '#ffffff' }],
      edges: [],
    };
    const context = {
      analyzer: undefined as ReturnType<typeof createExecutionAnalyzer> | undefined,
    };
    const refreshIndex = vi.fn(async function(this: unknown) {
      expect(this).toBe(context.analyzer);
      return graphData;
    });
    context.analyzer = createExecutionAnalyzer({ refreshIndex });
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: context.analyzer,
      analyzerInitialized: true,
    });

    await expect(
      refreshGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toBe(graphData);

    expect(refreshIndex).toHaveBeenCalledOnce();
  });

  it('falls back to analyzer analyze for full refreshes when refreshIndex is unavailable', async () => {
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: createExecutionAnalyzer({
        analyze,
        refreshIndex: undefined,
      }),
      analyzerInitialized: true,
    });

    await expect(
      refreshGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toEqual({ nodes: [], edges: [] });
    expect(analyze).toHaveBeenCalledOnce();
  });

  it('falls back to the empty graph when no refresh or analyze path is available', async () => {
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: createExecutionAnalyzer({
        analyze: undefined,
        refreshIndex: undefined,
      }),
      analyzerInitialized: true,
    });

    await expect(
      refreshGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toBe(EMPTY_GRAPH_DATA);
  });

  it('falls back to the empty graph when no analyzer exists for a full refresh', async () => {
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: undefined,
      analyzerInitialized: false,
    });

    await expect(
      refreshGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toBe(EMPTY_GRAPH_DATA);
  });

});

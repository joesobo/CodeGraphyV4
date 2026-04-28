import { describe, expect, it, vi } from 'vitest';
import {
  refreshGraphViewRawData,
  refreshIncrementalGraphViewRawData,
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

  it('runs scoped incremental refresh through the changed-file analyzer path', async () => {
    const refreshChangedFiles = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['src/index.ts'],
      analyzer: createExecutionAnalyzer({
        refreshChangedFiles,
      }),
      analyzerInitialized: true,
    });

    await refreshIncrementalGraphViewRawData(new AbortController().signal, state, vi.fn());

    expect(refreshChangedFiles).toHaveBeenCalledWith(
      ['src/index.ts'],
      [],
      new Set<string>(),
      expect.any(AbortSignal),
      expect.any(Function),
    );
  });

  it('falls back to analyzer analyze when incremental refresh support is unavailable', async () => {
    const analyzeResult = { nodes: [], edges: [] };
    const analyze = vi.fn(async () => analyzeResult);
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: createExecutionAnalyzer({
        analyze,
        refreshChangedFiles: undefined,
      }),
      analyzerInitialized: true,
    });

    await expect(
      refreshIncrementalGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toEqual(analyzeResult);

    expect(analyze).toHaveBeenCalledOnce();
  });

  it('uses empty changed-file paths for incremental refreshes and falls back to the empty graph', async () => {
    const refreshChangedFiles = vi.fn(async () => undefined as never);
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: undefined,
      analyzer: createExecutionAnalyzer({
        refreshChangedFiles,
      }),
      analyzerInitialized: true,
    });

    await expect(
      refreshIncrementalGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toEqual(EMPTY_GRAPH_DATA);
    expect(refreshChangedFiles).toHaveBeenCalledWith(
      [],
      [],
      new Set<string>(),
      expect.any(AbortSignal),
      expect.any(Function),
    );
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

  it('falls back to the empty graph when no analyzer exists for an incremental refresh', async () => {
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: undefined,
      analyzerInitialized: false,
    });

    await expect(
      refreshIncrementalGraphViewRawData(new AbortController().signal, state, vi.fn()),
    ).resolves.toBe(EMPTY_GRAPH_DATA);
  });
});

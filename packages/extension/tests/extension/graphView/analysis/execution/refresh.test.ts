import { describe, expect, it, vi } from 'vitest';
import {
  refreshGraphViewRawData,
  refreshIncrementalGraphViewRawData,
} from '../../../../../src/extension/graphView/analysis/execution/refresh';
import {
  createExecutionAnalyzer,
  createExecutionState,
} from './fixtures';

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
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: createExecutionAnalyzer({
        analyze,
        refreshChangedFiles: undefined,
      }),
      analyzerInitialized: true,
    });

    await refreshIncrementalGraphViewRawData(new AbortController().signal, state, vi.fn());

    expect(analyze).toHaveBeenCalledOnce();
  });
});

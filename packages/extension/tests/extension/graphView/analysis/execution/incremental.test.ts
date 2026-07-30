import { describe, expect, it, vi } from 'vitest';
import {
  refreshGraphViewChangedFiles,
} from '../../../../../src/extension/graphView/analysis/execution/incremental';
import type {
  GraphViewAnalysisExecutionState,
} from '../../../../../src/extension/graphView/analysis/execution';

function createState(
  analyzerOverrides: Record<string, unknown> = {},
): GraphViewAnalysisExecutionState {
  return {
    analyzer: {
      analyze: vi.fn(),
      hasIndex: vi.fn(() => true),
      initialize: vi.fn(),
      loadCachedGraph: vi.fn(async () => ({ nodes: [], edges: [] })),
      refreshChangedFiles: vi.fn(async () => ({
        nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }],
        edges: [],
      })),
      registry: {
        notifyPostAnalyze: vi.fn(),
      },
      syncWorkspacePlugins: vi.fn(),
      ...analyzerOverrides,
    },
    analyzerInitialized: true,
    analyzerInitPromise: undefined,
    changedFilePaths: ['/workspace/src/app.ts'],
    disabledPlugins: new Set(['plugin.disabled']),
    filterPatterns: ['generated/**'],
    mode: 'incremental',
  };
}

describe('graphView/analysis/execution/incremental', () => {
  it('hydrates the existing Graph Cache before the first saved-file update', async () => {
    const state = createState({
      hasLoadedGraphState: vi.fn(() => false),
    });
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    await expect(
      refreshGraphViewChangedFiles(signal, state, onProgress),
    ).resolves.toEqual({
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }],
      edges: [],
    });

    expect(state.analyzer?.loadCachedGraph).toHaveBeenCalledWith(
      ['generated/**'],
      new Set(['plugin.disabled']),
      signal,
    );
    expect(state.analyzer?.refreshChangedFiles).toHaveBeenCalledWith(
      ['/workspace/src/app.ts'],
      ['generated/**'],
      new Set(['plugin.disabled']),
      signal,
      onProgress,
    );
  });

  it('reuses loaded analysis state for later saved-file updates', async () => {
    const state = createState({
      hasLoadedGraphState: vi.fn(() => true),
    });

    await refreshGraphViewChangedFiles(
      new AbortController().signal,
      state,
      vi.fn(),
    );

    expect(state.analyzer?.loadCachedGraph).not.toHaveBeenCalled();
  });
});

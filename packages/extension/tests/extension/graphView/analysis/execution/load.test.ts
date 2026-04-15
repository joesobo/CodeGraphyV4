import { describe, expect, it, vi } from 'vitest';
import { loadGraphViewRawData } from '../../../../../src/extension/graphView/analysis/execution/load';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution load', () => {
  it('discovers a disconnected graph when loading without an existing index', async () => {
    const discoverGraph = vi.fn(async () => ({
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    }));
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        discoverGraph,
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.shouldDiscover).toBe(true);
    expect(discoverGraph).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
    expect(handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('analyzes the workspace when loading from an existing index', async () => {
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => true),
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.shouldDiscover).toBe(false);
    expect(analyze).toHaveBeenCalledOnce();
  });

  it('runs explicit full refresh through the analyzer refresh path', async () => {
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: createExecutionAnalyzer({
        refreshIndex: vi.fn(async (_patterns, _disabledPlugins, _signal, onProgress) => {
          onProgress?.({ phase: 'Refreshing Index', current: 1, total: 3 });
          return { nodes: [], edges: [] };
        }),
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 1,
      total: 3,
    });
  });
});

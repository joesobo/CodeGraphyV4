import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderRefreshMethods } from '../../../../../src/extension/graphView/provider/refresh';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createSource } from './fixture';

describe('graphView/provider/refresh cancellation', () => {
  it('refreshPluginFiles aborts superseded scoped requests and ignores stale results', async () => {
    const source = createSource();
    let finishFirstRefresh: (() => void) | undefined;
    let firstSignal: AbortSignal | undefined;
    source._analyzer.refreshPluginFiles
      .mockImplementationOnce(async (
        _pluginIds,
        _filterPatterns,
        _disabledPlugins,
        signal: AbortSignal,
        onProgress: (progress: { phase: string; current: number; total: number }) => void,
      ) => {
        firstSignal = signal;
        onProgress({ phase: 'Applying Plugin', current: 1, total: 2 });
        await new Promise<void>(resolve => {
          finishFirstRefresh = resolve;
        });
        return {
          nodes: [{ id: 'stale', label: 'stale', color: '#ffffff' }],
          edges: [],
        } satisfies IGraphData;
      })
      .mockImplementationOnce(async () => ({
        nodes: [{ id: 'fresh', label: 'fresh', color: '#ffffff' }],
        edges: [],
      } satisfies IGraphData));
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    const firstRefresh = methods.refreshPluginFiles(['codegraphy.first']);
    await Promise.resolve();
    const secondRefresh = methods.refreshPluginFiles(['codegraphy.second']);
    await secondRefresh;

    expect(firstSignal?.aborted).toBe(true);
    finishFirstRefresh?.();
    await firstRefresh;

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_PROGRESS',
      payload: { phase: 'Applying Plugin', current: 1, total: 2 },
    });
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._rawGraphData.nodes).toEqual([
      { id: 'fresh', label: 'fresh', color: '#ffffff' },
    ]);
    expect(source._analysisController).toBeUndefined();
  });

  it('smart rebuild aborts in-flight scoped refreshes and ignores their stale results', async () => {
    const source = createSource();
    let finishRefresh: (() => void) | undefined;
    let refreshSignal: AbortSignal | undefined;
    source._analyzer.refreshPluginFiles.mockImplementationOnce(async (
      _pluginIds,
      _filterPatterns,
      _disabledPlugins,
      signal: AbortSignal,
    ) => {
      refreshSignal = signal;
      await new Promise<void>(resolve => {
        finishRefresh = resolve;
      });
      return {
        nodes: [{ id: 'stale', label: 'stale', color: '#ffffff' }],
        edges: [],
      } satisfies IGraphData;
    });
    const rebuildGraphData = vi.fn();
    const smartRebuildGraphData = vi.fn((_state, _id, dependencies) => {
      dependencies.rebuildAndSend();
    });
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData,
    });

    const refresh = methods.refreshPluginFiles(['codegraphy.first']);
    await Promise.resolve();
    methods._smartRebuild('codegraphy.first');

    expect(refreshSignal?.aborted).toBe(true);
    finishRefresh?.();
    await refresh;

    expect(smartRebuildGraphData).toHaveBeenCalledOnce();
    expect(rebuildGraphData).toHaveBeenCalledOnce();
    expect(source._analysisController).toBeUndefined();
  });

  it('explicit reindex aborts in-flight scoped refreshes before stale results can publish', async () => {
    const source = createSource();
    let finishRefresh: (() => void) | undefined;
    let refreshSignal: AbortSignal | undefined;
    const staleGraph = {
      nodes: [{ id: 'stale-scope', label: 'stale-scope', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.refreshAnalysisScope.mockImplementationOnce(async (
      _filterPatterns,
      _disabledPlugins,
      signal: AbortSignal,
    ) => {
      refreshSignal = signal;
      await new Promise<void>(resolve => {
        finishRefresh = resolve;
      });
      return staleGraph;
    });
    const refreshAndSendData = vi.fn(async () => undefined);
    source._refreshAndSendData = refreshAndSendData;
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    const scopedRefresh = methods.refreshAnalysisScope();
    await Promise.resolve();
    await methods.refreshIndex();

    expect(refreshSignal?.aborted).toBe(true);
    expect(refreshAndSendData).toHaveBeenCalledOnce();
    finishRefresh?.();
    await scopedRefresh;

    expect(source._rawGraphData).not.toBe(staleGraph);
    expect(source._sendMessage).not.toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: expect.objectContaining({ nodes: staleGraph.nodes }),
    });
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._analysisController).toBeUndefined();
  });
});

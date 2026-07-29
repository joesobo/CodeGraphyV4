import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderRefreshMethods } from '../../../../../src/extension/graphView/provider/refresh';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createSource } from './fixture';

describe('graphView/provider/refresh targeted refreshes', () => {
  it('hydrateGraphScope replays cached graph data without scoped analysis or warm analysis', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{ id: 'symbol-node', label: 'symbol-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.loadCachedGraph.mockResolvedValueOnce(graphData);
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    await expect(methods.hydrateGraphScope()).resolves.toBe(true);

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledWith(
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
      {
        requiredAnalysisCacheTiers: ['baseline', 'symbols'],
      },
    );
    expect(source._analyzer.refreshAnalysisScope).not.toHaveBeenCalled();
    expect(source._loadAndSendData).not.toHaveBeenCalled();
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._rawGraphData).toBe(graphData);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: source._graphData,
    });
  });

  it('hydrateGraphScope returns false without publishing when the cached graph lacks symbol evidence', async () => {
    const source = createSource();
    source._analyzer.loadCachedGraph.mockResolvedValueOnce({ nodes: [], edges: [] });
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
    });

    await expect(methods.hydrateGraphScope()).resolves.toBe(false);

    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledWith(
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
      {
        requiredAnalysisCacheTiers: ['baseline', 'symbols'],
      },
    );
    expect(source._sendMessage).not.toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: source._graphData,
    });
  });

  it('hydrateGraphScope reuses hydrated graph memory without rereading Graph Cache', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{ id: 'symbol-node', label: 'symbol-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.loadCachedGraph.mockResolvedValueOnce(graphData);
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    await expect(methods.hydrateGraphScope()).resolves.toBe(true);
    await expect(methods.hydrateGraphScope()).resolves.toBe(true);

    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledOnce();
    expect(source._analyzer.refreshAnalysisScope).not.toHaveBeenCalled();
    expect(source._loadAndSendData).not.toHaveBeenCalled();
    expect(rebuildGraphData).not.toHaveBeenCalled();
  });

  it('hydratePluginGraphScope replays cached plugin evidence and remembers each hydrated plugin tier', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{ id: 'plugin-node', label: 'plugin-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.loadCachedGraph.mockResolvedValueOnce(graphData);
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
    });

    await expect(methods.hydratePluginGraphScope(['codegraphy.vue'])).resolves.toBe(true);
    await expect(methods.hydratePluginGraphScope(['codegraphy.vue'])).resolves.toBe(true);

    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledOnce();
    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledWith(
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
      {
        requiredAnalysisCacheTiers: ['baseline', 'plugin:codegraphy.vue'],
      },
    );
    expect(source._rawGraphData).toBe(graphData);
    expect(source._analyzer.refreshPluginFiles).not.toHaveBeenCalled();
  });

  it('refreshIndex clears remembered hydrated plugin tiers before the next cache replay', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{ id: 'plugin-node', label: 'plugin-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.loadCachedGraph.mockResolvedValue(graphData);
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
    });

    await expect(methods.hydratePluginGraphScope(['codegraphy.vue'])).resolves.toBe(true);
    await methods.refreshIndex();
    await expect(methods.hydratePluginGraphScope(['codegraphy.vue'])).resolves.toBe(true);

    expect(source._analyzer.loadCachedGraph).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderRefreshMethods } from '../../../../../src/extension/graphView/provider/refresh';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createSource } from './fixture';

describe('graphView/provider/refresh targeted refreshes', () => {
  it('refreshChangedFiles reloads discovered nodes instead of indexing when no index exists yet', async () => {
    const source = createSource();
    source._analyzer.hasIndex.mockReturnValue(false);
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
    });

    await methods.refreshChangedFiles(['src/example.ts']);

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendFavorites).not.toHaveBeenCalled();
  });

  it('refreshChangedFiles stays incremental for a loaded graph while index metadata is unavailable', async () => {
    const source = createSource({
      _rawGraphData: {
        nodes: [{ id: 'src/example.ts' }],
        edges: [],
      },
    });
    source._analyzer.hasIndex.mockReturnValue(false);
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
    });

    await methods.refreshChangedFiles(['src/example.ts']);

    expect(source._loadDisabledRulesAndPlugins).not.toHaveBeenCalled();
    expect(source._loadGroupsAndFilterPatterns).not.toHaveBeenCalled();
    expect(source._incrementalAnalyzeAndSendData).toHaveBeenCalledWith(['src/example.ts']);
    expect(source._loadAndSendData).not.toHaveBeenCalled();
    expect(source._sendAllSettings).not.toHaveBeenCalled();
  });

  it('refreshPluginFiles publishes the targeted plugin refresh result without rebuilding it again', async () => {
    const source = createSource();
    source._analyzer.hasIndex.mockReturnValue(false);
    const graphData = {
      nodes: [{ id: 'plugin-node', label: 'plugin-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.refreshPluginFiles.mockResolvedValueOnce(graphData);
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    await methods.refreshPluginFiles(['codegraphy.typescript']);

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._analyzer.refreshPluginFiles).toHaveBeenCalledWith(
      ['codegraphy.typescript'],
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(source._loadAndSendData).not.toHaveBeenCalled();
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._rawGraphData).toBe(graphData);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: source._graphData,
    });
    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendFavorites).not.toHaveBeenCalled();
  });

  it('refreshGitignoreMetadata publishes metadata-only refresh results without a full index refresh', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{
        color: '#64748B',
        id: 'example-python/src/main.py',
        label: 'main.py',
        metadata: { gitIgnored: true },
      }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.refreshGitignoreMetadata.mockResolvedValueOnce(graphData);
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    await methods.refreshGitignoreMetadata();

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._analyzer.refreshGitignoreMetadata).toHaveBeenCalledWith(
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
    );
    expect(source._loadAndSendData).not.toHaveBeenCalled();
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._rawGraphData).toBe(graphData);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: source._graphData,
    });
    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendFavorites).not.toHaveBeenCalled();
  });

  it('refreshAnalysisScope forwards progress from the scoped refresh request', async () => {
    const source = createSource();
    const graphData = {
      nodes: [{ id: 'symbol-node', label: 'symbol-node', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    source._analyzer.refreshAnalysisScope.mockImplementationOnce(async (
      _filterPatterns,
      _disabledPlugins,
      signal: AbortSignal,
      onProgress: (progress: { phase: string; current: number; total: number }) => void,
    ) => {
      onProgress({ phase: 'Applying Scope', current: 1, total: 3 });
      expect(signal.aborted).toBe(false);
      return graphData;
    });
    const rebuildGraphData = vi.fn();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
    });

    await methods.refreshAnalysisScope();

    expect(source._analyzer.refreshAnalysisScope).toHaveBeenCalledWith(
      ['src/**'],
      source._disabledPlugins,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_PROGRESS',
      payload: { phase: 'Applying Scope', current: 1, total: 3 },
    });
    expect(rebuildGraphData).not.toHaveBeenCalled();
    expect(source._rawGraphData).toBe(graphData);
    expect(source._analysisController).toBeUndefined();
  });
});

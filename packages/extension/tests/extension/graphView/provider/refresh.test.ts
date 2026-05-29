import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderRefreshMethods } from '../../../../src/extension/graphView/provider/refresh';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';

function createSource(
  overrides: Partial<Record<string, unknown>> = {},
): {
  _analyzer: {
    hasIndex: ReturnType<typeof vi.fn>;
    rebuildGraph: ReturnType<typeof vi.fn>;
    refreshPluginFiles: ReturnType<typeof vi.fn>;
    getPluginStatuses: ReturnType<typeof vi.fn>;
    registry: { notifyGraphRebuild: ReturnType<typeof vi.fn> };
    clearCache: ReturnType<typeof vi.fn>;
  };
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins: ReturnType<typeof vi.fn>;
  _loadGroupsAndFilterPatterns: ReturnType<typeof vi.fn>;
  _loadAndSendData?: ReturnType<typeof vi.fn>;
  _refreshAndSendData?: ReturnType<typeof vi.fn>;
  _incrementalAnalyzeAndSendData?: ReturnType<typeof vi.fn>;
  _analyzeAndSendData: ReturnType<typeof vi.fn>;
  _sendAllSettings: ReturnType<typeof vi.fn>;
  _sendFavorites: ReturnType<typeof vi.fn>;
  _computeMergedGroups: ReturnType<typeof vi.fn>;
  _sendGroupsUpdated: ReturnType<typeof vi.fn>;
  _sendGraphControls: ReturnType<typeof vi.fn>;
  _sendSettings: ReturnType<typeof vi.fn>;
  _sendPhysicsSettings: ReturnType<typeof vi.fn>;
  _updateViewContext: ReturnType<typeof vi.fn>;
  _applyViewTransform: ReturnType<typeof vi.fn>;
  _sendDepthState: ReturnType<typeof vi.fn>;
  _sendPluginStatuses: ReturnType<typeof vi.fn>;
  _sendDecorations: ReturnType<typeof vi.fn>;
  _sendMessage: ReturnType<typeof vi.fn>;
  _rebuildAndSend?: (() => void) | ReturnType<typeof vi.fn> | undefined;
} {
  return {
    _analyzer: {
      hasIndex: vi.fn(() => true),
      rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
      refreshPluginFiles: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
      getPluginStatuses: vi.fn(() => [] satisfies IPluginStatus[]),
      registry: { notifyGraphRebuild: vi.fn() },
      clearCache: vi.fn(),
    },
    _disabledPlugins: new Set<string>(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _loadDisabledRulesAndPlugins: vi.fn(() => true),
    _loadGroupsAndFilterPatterns: vi.fn(),
    _loadAndSendData: vi.fn(async () => undefined),
    _incrementalAnalyzeAndSendData: vi.fn(async () => undefined),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _sendAllSettings: vi.fn(),
    _sendFavorites: vi.fn(),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendGraphControls: vi.fn(),
    _sendSettings: vi.fn(),
    _sendPhysicsSettings: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    _sendDepthState: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendMessage: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/refresh', () => {

    it('refresh reloads disabled settings and group state before reloading graph data', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
      expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
      expect(source._loadAndSendData).toHaveBeenCalledOnce();
      expect(source._analyzeAndSendData).not.toHaveBeenCalled();
    });



    it('refresh resends the full settings snapshot after re-analysis', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._sendAllSettings).toHaveBeenCalledOnce();
      expect(source._sendSettings).not.toHaveBeenCalled();
      expect(source._sendPhysicsSettings).not.toHaveBeenCalled();
    });



    it('refresh resends favorites after re-analysis', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._sendFavorites).toHaveBeenCalledOnce();
    });



    it('refreshIndex uses the explicit reindex path when available', async () => {
      const refreshAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refreshIndex();

      expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
      expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
      expect(refreshAndSendData).toHaveBeenCalledOnce();
      expect(source._analyzeAndSendData).not.toHaveBeenCalled();
      expect(source._sendAllSettings).toHaveBeenCalledOnce();
      expect(source._sendFavorites).toHaveBeenCalledOnce();
    });



    it('queues changed-file refreshes while a full index refresh is running', async () => {
      let finishRefreshIndex: (() => void) | undefined;
      const refreshAndSendData = vi.fn(async () => {
        await new Promise<void>(resolve => {
          finishRefreshIndex = resolve;
        });
      });
      const incrementalAnalyzeAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
        _incrementalAnalyzeAndSendData: incrementalAnalyzeAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      const refreshIndex = methods.refreshIndex();
      await Promise.resolve();
      const changedFiles = methods.refreshChangedFiles(['src/branch.ts']);

      expect(incrementalAnalyzeAndSendData).not.toHaveBeenCalled();

      finishRefreshIndex?.();
      await refreshIndex;
      await changedFiles;

      expect(incrementalAnalyzeAndSendData).toHaveBeenCalledWith(['src/branch.ts']);
    });



    it('prevents normal graph refreshes from interrupting a full index refresh', async () => {
      let finishRefreshIndex: (() => void) | undefined;
      const refreshAndSendData = vi.fn(async () => {
        await new Promise<void>(resolve => {
          finishRefreshIndex = resolve;
        });
      });
      const loadAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
        _loadAndSendData: loadAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      const refreshIndex = methods.refreshIndex();
      await Promise.resolve();
      const refresh = methods.refresh();

      expect(loadAndSendData).not.toHaveBeenCalled();

      finishRefreshIndex?.();
      await refreshIndex;
      await refresh;

      expect(refreshAndSendData).toHaveBeenCalledOnce();
      expect(loadAndSendData).not.toHaveBeenCalled();
    });



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
      expect(source._sendFavorites).toHaveBeenCalledOnce();
    });

    it('refreshPluginFiles applies the targeted plugin refresh when only the persisted index is missing', async () => {
      const source = createSource();
      source._analyzer.hasIndex.mockReturnValue(false);
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
        [],
        source._disabledPlugins,
      );
      expect(source._loadAndSendData).not.toHaveBeenCalled();
      expect(rebuildGraphData).toHaveBeenCalledOnce();
      expect(source._sendAllSettings).toHaveBeenCalledOnce();
      expect(source._sendFavorites).toHaveBeenCalledOnce();
    });
});

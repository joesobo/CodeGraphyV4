import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
import { createGraphViewProviderRefreshMethods } from '../../../../src/extension/graphView/provider/refresh';

function createSource(
  overrides: Partial<Record<string, unknown>> = {},
): {
  _analyzer: {
    rebuildGraph: ReturnType<typeof vi.fn>;
    getPluginStatuses: ReturnType<typeof vi.fn>;
    registry: { notifyGraphRebuild: ReturnType<typeof vi.fn> };
    clearCache: ReturnType<typeof vi.fn>;
  };
  _disabledRules: Set<string>;
  _disabledPlugins: Set<string>;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins: ReturnType<typeof vi.fn>;
  _loadGroupsAndFilterPatterns: ReturnType<typeof vi.fn>;
  _analyzeAndSendData: ReturnType<typeof vi.fn>;
  _sendAllSettings: ReturnType<typeof vi.fn>;
  _sendGroupsUpdated: ReturnType<typeof vi.fn>;
  _sendSettings: ReturnType<typeof vi.fn>;
  _sendPhysicsSettings: ReturnType<typeof vi.fn>;
  _updateViewContext: ReturnType<typeof vi.fn>;
  _applyViewTransform: ReturnType<typeof vi.fn>;
  _sendAvailableViews: ReturnType<typeof vi.fn>;
  _sendPluginStatuses: ReturnType<typeof vi.fn>;
  _sendDecorations: ReturnType<typeof vi.fn>;
  _sendMessage: ReturnType<typeof vi.fn>;
  _rebuildAndSend?: (() => void) | ReturnType<typeof vi.fn> | undefined;
} {
  return {
    _analyzer: {
      rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
      getPluginStatuses: vi.fn(() => [] satisfies IPluginStatus[]),
      registry: { notifyGraphRebuild: vi.fn() },
      clearCache: vi.fn(),
    },
    _disabledRules: new Set<string>(),
    _disabledPlugins: new Set<string>(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _loadDisabledRulesAndPlugins: vi.fn(() => true),
    _loadGroupsAndFilterPatterns: vi.fn(),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _sendAllSettings: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendSettings: vi.fn(),
    _sendPhysicsSettings: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    _sendAvailableViews: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendMessage: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/refresh', () => {
  it('refresh reloads disabled settings and group state before re-analysis', async () => {
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    await methods.refresh();

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('refresh resends the full settings snapshot after re-analysis', async () => {
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    await methods.refresh();

    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendSettings).not.toHaveBeenCalled();
    expect(source._sendPhysicsSettings).not.toHaveBeenCalled();
  });

  it('refreshToggleSettings rebuilds only when the disabled state changes', () => {
    const rebuildGraphData = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    methods.refreshToggleSettings();

    expect(rebuildGraphData).toHaveBeenCalledOnce();
    source._loadDisabledRulesAndPlugins.mockReturnValueOnce(false);

    methods.refreshToggleSettings();

    expect(rebuildGraphData).toHaveBeenCalledOnce();
  });

  it('refreshToggleSettings prefers a source override rebuild implementation when present', () => {
    const rebuildGraphData = vi.fn();
    const rebuildOverride = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });
    source._rebuildAndSend = rebuildOverride as never;

    methods.refreshToggleSettings();

    expect(rebuildOverride).toHaveBeenCalledOnce();
    expect(rebuildGraphData).not.toHaveBeenCalled();
  });

  it('refreshToggleSettings falls back to the local rebuild helper when the source callback is cleared', () => {
    const rebuildGraphData = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    source._rebuildAndSend = undefined as never;

    methods.refreshToggleSettings();

    expect(rebuildGraphData).toHaveBeenCalledOnce();
  });

  it('refreshToggleSettings ignores a self-installed rebuild implementation', () => {
    const rebuildGraphData = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    source._rebuildAndSend = methods._rebuildAndSend as never;

    methods.refreshToggleSettings();

    expect(rebuildGraphData).toHaveBeenCalledOnce();
  });

  it('refreshGroupSettings reloads group state from configuration and re-sends only groups', () => {
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    methods.refreshGroupSettings();

    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendAllSettings).not.toHaveBeenCalled();
    expect(source._sendSettings).not.toHaveBeenCalled();
  });

  it('rebuild and smart rebuild delegate to the graph view rebuild helpers', () => {
    const rebuildGraphData = vi.fn((_nextSource, handlers: {
      getShowOrphans(): boolean;
      updateViewContext(): void;
      applyViewTransform(): void;
      sendAvailableViews(): void;
      sendPluginStatuses(): void;
      sendDecorations(): void;
      sendMessage(message: unknown): void;
    }) => {
      expect(handlers.getShowOrphans()).toBe(false);
      handlers.updateViewContext();
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendPluginStatuses();
      handlers.sendDecorations();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED' });
    });
    const statuses = [
      {
        id: 'plugin.test',
        name: 'Plugin Test',
        version: '1.0.0',
        supportedExtensions: [],
        status: 'active' as const,
        enabled: true,
        connectionCount: 0,
        rules: [],
      },
    ] satisfies IPluginStatus[];
    const smartRebuildGraphData = vi.fn((_nextSource, _kind, _id, handlers: {
      shouldRebuild(statuses: readonly IPluginStatus[], nextKind: 'rule' | 'plugin', nextId: string): boolean;
      rebuildAndSend(): void;
      sendMessage(message: unknown): void;
    }) => {
      expect(handlers.shouldRebuild(statuses, 'plugin', 'plugin.test')).toBe(false);
      handlers.rebuildAndSend();
      handlers.sendMessage({ type: 'PLUGINS_UPDATED' });
    });
    const shouldRebuild = vi.fn(() => false);
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData,
      shouldRebuild,
    });
    const rebuildOverride = vi.fn();
    source._rebuildAndSend = rebuildOverride;

    methods._rebuildAndSend();
    methods._smartRebuild('plugin', 'plugin.test');

    expect(source._updateViewContext).toHaveBeenCalledOnce();
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendAvailableViews).toHaveBeenCalledOnce();
    expect(source._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
    expect(smartRebuildGraphData).toHaveBeenCalledOnce();
    expect(shouldRebuild).toHaveBeenCalledWith(statuses, 'plugin', 'plugin.test');
    expect(rebuildOverride).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'PLUGINS_UPDATED' });
  });

  it('smart rebuild falls back to the local rebuild helper when the source callback is cleared', () => {
    const rebuildGraphData = vi.fn();
    const smartRebuildGraphData = vi.fn((_nextSource, _kind, _id, handlers: {
      rebuildAndSend(): void;
    }) => {
      handlers.rebuildAndSend();
    });
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData,
      shouldRebuild: vi.fn(() => true),
    });

    source._rebuildAndSend = undefined;

    methods._smartRebuild('plugin', 'plugin.test');

    expect(smartRebuildGraphData).toHaveBeenCalledOnce();
    expect(rebuildGraphData).toHaveBeenCalledOnce();
  });

  it('smart rebuild ignores a self-installed rebuild implementation', () => {
    const rebuildGraphData = vi.fn();
    const smartRebuildGraphData = vi.fn((_nextSource, _kind, _id, handlers: {
      rebuildAndSend(): void;
    }) => {
      handlers.rebuildAndSend();
    });
    const source = createSource();
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => false),
      rebuildGraphData,
      smartRebuildGraphData,
      shouldRebuild: vi.fn(() => true),
    });

    source._rebuildAndSend = methods._rebuildAndSend;

    methods._smartRebuild('plugin', 'plugin.test');

    expect(smartRebuildGraphData).toHaveBeenCalledOnce();
    expect(rebuildGraphData).toHaveBeenCalledOnce();
  });

  it('clearCacheAndRefresh clears analyzer cache before re-analysis', async () => {
    const clearCache = vi.fn();
    const source = createSource({
      _analyzer: { clearCache },
    });
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    await methods.clearCacheAndRefresh();
    methods.refreshPhysicsSettings();
    methods.refreshSettings();

    expect(clearCache).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
  });

  it('uses the default show-orphans configuration when rebuilding with default dependencies', async () => {
    vi.resetModules();

    const get = vi.fn((_key: string, fallback: boolean) => fallback);
    const getConfiguration = vi.fn(() => ({ get }));
    const rebuildGraphData = vi.fn((_source: unknown, handlers: { getShowOrphans(): boolean }) => {
      expect(handlers.getShowOrphans()).toBe(true);
    });

    vi.doMock('vscode', () => ({
      workspace: {
        getConfiguration,
      },
    }));
    vi.doMock('../../../../src/extension/graphView/view/rebuild', () => ({
      rebuildGraphViewData: rebuildGraphData,
      smartRebuildGraphView: vi.fn(),
    }));
    vi.doMock('../../../../src/extension/graphView/rebuild', () => ({
      shouldRebuildGraphView: vi.fn(() => true),
    }));

    const { createGraphViewProviderRefreshMethods: createMethods } = await import(
      '../../../../src/extension/graphView/provider/refresh'
    );

    createMethods(createSource() as never)._rebuildAndSend();

    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(get).toHaveBeenCalledWith('showOrphans', true);

    vi.doUnmock('vscode');
    vi.doUnmock('../../../../src/extension/graphView/view/rebuild');
    vi.doUnmock('../../../../src/extension/graphView/rebuild');
    vi.resetModules();
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderRefreshMethods } from '../../../src/extension/graphView/providerRefreshMethods';

describe('graphView/providerRefreshMethods', () => {
  it('refresh reloads disabled settings, re-analyzes, and resends settings', async () => {
    const source = {
      _analyzer: { clearCache: vi.fn() },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _loadDisabledRulesAndPlugins: vi.fn(() => true),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendSettings: vi.fn(),
      _sendPhysicsSettings: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendMessage: vi.fn(),
    };
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData: vi.fn(),
      smartRebuildGraphData: vi.fn(),
      shouldRebuild: vi.fn(() => true),
    });

    await methods.refresh();

    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('refreshToggleSettings rebuilds only when the disabled state changes', () => {
    const rebuildGraphData = vi.fn();
    const source = {
      _analyzer: { clearCache: vi.fn() },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _loadDisabledRulesAndPlugins: vi.fn(() => true),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendSettings: vi.fn(),
      _sendPhysicsSettings: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendMessage: vi.fn(),
    };
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

  it('rebuild and smart rebuild delegate to the graph view rebuild helpers', () => {
    const rebuildGraphData = vi.fn();
    const smartRebuildGraphData = vi.fn();
    const shouldRebuild = vi.fn(() => false);
    const source = {
      _analyzer: { clearCache: vi.fn() },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _loadDisabledRulesAndPlugins: vi.fn(() => true),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendSettings: vi.fn(),
      _sendPhysicsSettings: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendMessage: vi.fn(),
    };
    const methods = createGraphViewProviderRefreshMethods(source as never, {
      getShowOrphans: vi.fn(() => true),
      rebuildGraphData,
      smartRebuildGraphData,
      shouldRebuild,
    });

    methods._rebuildAndSend();
    methods._smartRebuild('plugin', 'plugin.test');

    expect(rebuildGraphData).toHaveBeenCalledOnce();
    expect(smartRebuildGraphData).toHaveBeenCalledOnce();
    const smartRebuildArgs = smartRebuildGraphData.mock.calls[0][3];
    smartRebuildArgs.shouldRebuild(['status'], 'plugin', 'plugin.test');
    smartRebuildArgs.sendMessage({ type: 'PLUGINS_UPDATED' });
    expect(shouldRebuild).toHaveBeenCalledWith(['status'], 'plugin', 'plugin.test');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'PLUGINS_UPDATED' });
  });

  it('clearCacheAndRefresh clears analyzer cache before re-analysis', async () => {
    const clearCache = vi.fn();
    const source = {
      _analyzer: { clearCache },
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _loadDisabledRulesAndPlugins: vi.fn(() => true),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _sendSettings: vi.fn(),
      _sendPhysicsSettings: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendMessage: vi.fn(),
    };
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
});

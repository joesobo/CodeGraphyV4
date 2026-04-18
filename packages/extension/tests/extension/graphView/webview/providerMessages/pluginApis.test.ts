import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderPluginApis } from '../../../../../src/extension/graphView/webview/providerMessages/pluginApis';

describe('graphView/webview/providerMessages/pluginApis', () => {
  it('routes plugin api lookups and webview-ready notifications through the registry', () => {
    const notifyWebviewReady = vi.fn();
    const getPluginAPI = vi.fn((pluginId: string) => ({ pluginId }));
    const source = {
      _analyzer: {
        registry: {
          notifyWebviewReady,
          getPluginAPI,
        },
      },
    };

    const apis = createGraphViewProviderPluginApis(source as never);

    apis.notifyWebviewReady();

    expect(apis.getInteractionPluginApi('plugin.interaction')).toEqual({
      pluginId: 'plugin.interaction',
    });
    expect(apis.getContextMenuPluginApi('plugin.context')).toEqual({
      pluginId: 'plugin.context',
    });
    expect(apis.getExporterPluginApi('plugin.exporter')).toEqual({
      pluginId: 'plugin.exporter',
    });
    expect(apis.getToolbarActionPluginApi('plugin.toolbar')).toEqual({
      pluginId: 'plugin.toolbar',
    });
    expect(notifyWebviewReady).toHaveBeenCalledOnce();
    expect(getPluginAPI).toHaveBeenNthCalledWith(1, 'plugin.interaction');
    expect(getPluginAPI).toHaveBeenNthCalledWith(2, 'plugin.context');
    expect(getPluginAPI).toHaveBeenNthCalledWith(3, 'plugin.exporter');
    expect(getPluginAPI).toHaveBeenNthCalledWith(4, 'plugin.toolbar');
  });

  it('returns undefined when the registry is unavailable', () => {
    const apis = createGraphViewProviderPluginApis({ _analyzer: undefined } as never);

    expect(apis.getInteractionPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getContextMenuPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getExporterPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getToolbarActionPluginApi('plugin.test')).toBeUndefined();
    expect(() => apis.notifyWebviewReady()).not.toThrow();
  });

  it('returns undefined when the analyzer exists but its registry does not', () => {
    const apis = createGraphViewProviderPluginApis({ _analyzer: {} } as never);

    expect(apis.getInteractionPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getContextMenuPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getExporterPluginApi('plugin.test')).toBeUndefined();
    expect(apis.getToolbarActionPluginApi('plugin.test')).toBeUndefined();
    expect(() => apis.notifyWebviewReady()).not.toThrow();
  });
});

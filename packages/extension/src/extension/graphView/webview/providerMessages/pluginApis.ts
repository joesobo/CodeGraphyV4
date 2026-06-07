import type { GraphViewProviderMessageListenerSource } from './listener';

type GraphViewInteractionPluginApi = {
  deliverWebviewMessage(message: { type: string; data: unknown }): void;
};

type GraphViewContextMenuPluginApi = {
  contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }>;
};

type GraphViewExporterPluginApi = {
  exporters: ReadonlyArray<{ run(): Promise<void> | void }>;
};

type GraphViewToolbarActionPluginApi = {
  toolbarActions: ReadonlyArray<{ items: ReadonlyArray<{ run(): Promise<void> | void }> }>;
};

export function createGraphViewProviderPluginApis(
  source: GraphViewProviderMessageListenerSource,
) {
  const getActivePluginApi = (pluginId: string): unknown => {
    if (source._disabledPlugins?.has(pluginId)) {
      return undefined;
    }

    return source._analyzer?.registry?.getPluginAPI(pluginId);
  };

  return {
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    getInteractionPluginApi: (pluginId: string) =>
      getActivePluginApi(pluginId) as
        | GraphViewInteractionPluginApi
        | undefined,
    getContextMenuPluginApi: (pluginId: string) =>
      getActivePluginApi(pluginId) as
        | GraphViewContextMenuPluginApi
        | undefined,
    getExporterPluginApi: (pluginId: string) =>
      getActivePluginApi(pluginId) as
        | GraphViewExporterPluginApi
        | undefined,
    getToolbarActionPluginApi: (pluginId: string) =>
      getActivePluginApi(pluginId) as
        | GraphViewToolbarActionPluginApi
        | undefined,
  };
}

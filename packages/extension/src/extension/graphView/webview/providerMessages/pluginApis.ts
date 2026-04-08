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
  return {
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    getInteractionPluginApi: (pluginId: string) =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewInteractionPluginApi
        | undefined,
    getContextMenuPluginApi: (pluginId: string) =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewContextMenuPluginApi
        | undefined,
    getExporterPluginApi: (pluginId: string) =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewExporterPluginApi
        | undefined,
    getToolbarActionPluginApi: (pluginId: string) =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | GraphViewToolbarActionPluginApi
        | undefined,
  };
}

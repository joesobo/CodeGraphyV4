import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  collectGraphViewContextMenuItems,
  collectGraphViewExporters,
  collectGraphViewToolbarActions,
  collectGraphViewWebviewInjections,
} from './contributions';

interface GraphViewPluginRegistry {
  list(): Array<{
    plugin: {
      id: string;
      name?: string;
      webviewContributions?: {
        scripts?: string[];
        styles?: string[];
      };
    };
  }>;
  getPluginAPI(pluginId: string):
    | {
        readonly contextMenuItems: ReadonlyArray<{
          label: string;
          when: 'node' | 'edge' | 'both';
          icon?: string;
          group?: string;
        }>;
        readonly exporters?: ReadonlyArray<{
          id: string;
          label: string;
          description?: string;
          group?: string;
        }>;
        readonly toolbarActions?: ReadonlyArray<{
          id: string;
          label: string;
          icon?: string;
          description?: string;
          items: ReadonlyArray<{
            id: string;
            label: string;
            description?: string;
          }>;
        }>;
      }
    | undefined;
}

interface GraphViewPluginAnalyzer {
  registry: GraphViewPluginRegistry;
}

export function sendGraphViewContextMenuItems(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>
  ) => void,
): void {
  if (!analyzer) return;

  const items = collectGraphViewContextMenuItems(
    analyzer.registry.list(),
    (pluginId) => analyzer.registry.getPluginAPI(pluginId),
  );
  sendMessage({ type: 'CONTEXT_MENU_ITEMS', payload: { items } });
}

export function sendGraphViewPluginExporters(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_EXPORTERS_UPDATED' }>
  ) => void,
): void {
  if (!analyzer) return;

  const items = collectGraphViewExporters(
    analyzer.registry.list(),
    (pluginId) => {
      const api = analyzer.registry.getPluginAPI(pluginId);
      if (!api) return undefined;
      return {
        exporters: api.exporters ?? [],
      };
    },
  );
  sendMessage({ type: 'PLUGIN_EXPORTERS_UPDATED', payload: { items } });
}

export function sendGraphViewPluginToolbarActions(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED' }>
  ) => void,
): void {
  if (!analyzer) return;

  const items = collectGraphViewToolbarActions(
    analyzer.registry.list(),
    (pluginId) => {
      const api = analyzer.registry.getPluginAPI(pluginId);
      if (!api) return undefined;
      return {
        toolbarActions: api.toolbarActions ?? [],
      };
    },
  );
  sendMessage({ type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED', payload: { items } });
}

export function sendGraphViewPluginWebviewInjections(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  resolveAssetPath: (assetPath: string, pluginId?: string) => string,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_WEBVIEW_INJECT' }>
  ) => void,
): void {
  if (!analyzer) return;

  const injections = collectGraphViewWebviewInjections(
    analyzer.registry.list(),
    resolveAssetPath,
  );
  for (const injection of injections) {
    sendMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: injection,
    });
  }
}

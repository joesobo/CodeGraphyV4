import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { collectGraphViewWebviewInjections } from './contributions';

interface GraphViewExtensionPluginRegistry {
  extensionPlugins: {
    listActive(): Array<{
      descriptorSignature?: string;
      plugin: {
        id: string;
        name?: string;
        webviewContributions?: {
          scripts?: string[];
          styles?: string[];
          assets?: Array<{
            id: string;
            label: string;
            path: string;
            kind?: string;
            metadata?: Record<string, unknown>;
          }>;
        };
      };
    }>;
  };
}

function listActiveExtensionPluginInfos(
  registry: GraphViewExtensionPluginRegistry,
  disabledPlugins: ReadonlySet<string>,
): ReturnType<GraphViewExtensionPluginRegistry['extensionPlugins']['listActive']> {
  return registry.extensionPlugins.listActive().filter(info => !disabledPlugins.has(info.plugin.id));
}

export function sendGraphViewPluginWebviewInjections(
  analyzer: { registry: GraphViewExtensionPluginRegistry } | undefined,
  resolveAssetPath: (assetPath: string, pluginId?: string) => string,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_WEBVIEW_INJECT' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  if (!analyzer) return;

  const injections = collectGraphViewWebviewInjections(
    listActiveExtensionPluginInfos(analyzer.registry, disabledPlugins),
    resolveAssetPath,
  );
  for (const injection of injections) {
    sendMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: injection,
    });
  }
}

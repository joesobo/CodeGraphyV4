import type { CodeGraphyWorkspacePluginSettings } from '@codegraphy-dev/core';
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

function orderWorkspacePlugins(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  packageNames: readonly string[],
): CodeGraphyWorkspacePluginSettings[] {
  const selectedPackages = new Set(packageNames);
  const pluginByPackage = new Map(plugins.map(plugin => [plugin.package, plugin] as const));
  const orderedPlugins = packageNames
    .map(packageName => pluginByPackage.get(packageName))
    .filter((plugin): plugin is CodeGraphyWorkspacePluginSettings => Boolean(plugin));
  const remainingPlugins = plugins.filter(plugin => !selectedPackages.has(plugin.package));

  return [...orderedPlugins, ...remainingPlugins];
}

export async function applyPluginPackageOrderUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_PLUGIN_PACKAGE_ORDER' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  await handlers.updateConfig(
    'plugins',
    orderWorkspacePlugins(
      handlers.getConfig<CodeGraphyWorkspacePluginSettings[]>('plugins', []),
      message.payload.packageNames,
    ),
  );
  await handlers.analyzeAndSendData();
  return true;
}

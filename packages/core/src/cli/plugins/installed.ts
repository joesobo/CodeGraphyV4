import {
  createBundledMarkdownInstalledPluginRecord,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
} from '../../plugins/installedCache';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from '../../workspace/settings';

export function getRegisteredPluginId(plugin: CodeGraphyInstalledPluginRecord): string {
  return plugin.id;
}

export function findRegisteredPlugin(
  cache: CodeGraphyInstalledPluginCache,
  pluginIdOrPackageName: string,
): CodeGraphyInstalledPluginRecord | undefined {
  return findRegisteredPlugins(cache, pluginIdOrPackageName)[0];
}

export function findRegisteredPlugins(
  cache: CodeGraphyInstalledPluginCache,
  pluginIdOrPackageName: string,
): CodeGraphyInstalledPluginRecord[] {
  if (
    pluginIdOrPackageName === CODEGRAPHY_MARKDOWN_PLUGIN_ID
    || pluginIdOrPackageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME
  ) {
    return [createBundledMarkdownInstalledPluginRecord()];
  }

  const exactPlugin = cache.plugins.find(plugin => plugin.id === pluginIdOrPackageName);
  if (exactPlugin) return [exactPlugin];
  return cache.plugins.filter(plugin => plugin.package === pluginIdOrPackageName);
}

export function listRegisteredPluginsWithBundledMarkdown(
  cache: CodeGraphyInstalledPluginCache,
): CodeGraphyInstalledPluginRecord[] {
  if (cache.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)) {
    return cache.plugins;
  }

  return [
    createBundledMarkdownInstalledPluginRecord(),
    ...cache.plugins,
  ];
}

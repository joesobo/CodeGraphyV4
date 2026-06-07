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
  if (plugin.pluginId) {
    return plugin.pluginId;
  }

  return plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME
    ? CODEGRAPHY_MARKDOWN_PLUGIN_ID
    : plugin.package;
}

export function findRegisteredPlugin(
  cache: CodeGraphyInstalledPluginCache,
  pluginIdOrPackageName: string,
): CodeGraphyInstalledPluginRecord | undefined {
  if (
    pluginIdOrPackageName === CODEGRAPHY_MARKDOWN_PLUGIN_ID
    || pluginIdOrPackageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME
  ) {
    return createBundledMarkdownInstalledPluginRecord();
  }

  return cache.plugins.find(plugin =>
    plugin.package === pluginIdOrPackageName
    || getRegisteredPluginId(plugin) === pluginIdOrPackageName
  );
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

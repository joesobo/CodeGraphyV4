import {
  createBundledMarkdownInstalledPluginRecord,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
} from '../../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME } from '../../workspace/settings';

export function findCachedPlugin(
  cache: CodeGraphyInstalledPluginCache,
  packageName: string,
): CodeGraphyInstalledPluginRecord | undefined {
  if (packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME) {
    return createBundledMarkdownInstalledPluginRecord();
  }

  return cache.plugins.find(plugin => plugin.package === packageName);
}

export function listInstalledPluginsWithBundledMarkdown(
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

import { CODEGRAPHY_MARKDOWN_PLUGIN_METADATA } from '../markdown/metadata';
import { createPluginActivityState } from '../activityState/model';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import type { CodeGraphyUserStateOptions } from './contracts';
import { readCodeGraphyInstalledPluginCache } from './storage';

export function createBundledMarkdownInstalledPluginRecord(): CodeGraphyInstalledPluginRecord {
  return {
    package: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.packageName,
    version: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.version,
    id: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.id,
    name: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.name,
    host: 'core',
    entry: './dist/plugin.js',
    apiVersion: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.apiVersion,
    data: {
      updateImpact: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.updateImpact,
    },
    packageRoot: 'codegraphy:bundled',
    globallyEnabled: true,
  };
}

export function isBundledMarkdownPluginEnabled(
  settings: CodeGraphyWorkspaceSettings,
  options: CodeGraphyUserStateOptions = {},
): boolean {
  const bundled = createBundledMarkdownInstalledPluginRecord();
  const installed = readCodeGraphyInstalledPluginCache(options).plugins.find(plugin => (
    plugin.id === bundled.id && plugin.package === bundled.package
  )) ?? bundled;
  return createPluginActivityState({
    settings,
    installedPlugins: [installed],
    builtInPluginIds: [bundled.id],
  }).activePluginIds.has(bundled.id);
}

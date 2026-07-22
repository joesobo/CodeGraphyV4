import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { createPluginActivityState } from '../plugins/activityState/model';
import { readCodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_METADATA } from '../plugins/markdown/metadata';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
} from './signatures';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  type CodeGraphyWorkspaceSettings,
} from './settings';

function createDefaultStatusRuntimePlugins(
  activePluginIds: ReadonlySet<string>,
): Array<Pick<IPlugin, 'id' | 'version'>> {
  const plugins: Array<Pick<IPlugin, 'id' | 'version'>> = [];
  if (activePluginIds.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)) {
    plugins.push({
      id: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.id,
      version: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.version,
    });
  }
  return plugins;
}

export function createDefaultStatusPluginSignature(
  settings: CodeGraphyWorkspaceSettings,
  homeDir: string | undefined,
): string | null {
  const installedPlugins = readCodeGraphyInstalledPluginCache({
    ...(homeDir ? { homeDir } : {}),
  }).plugins;
  const installedPluginIds = new Set(installedPlugins.map(plugin => plugin.id));
  const activity = createPluginActivityState({
    settings,
    installedPlugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const missingPackagePlugins = settings.plugins
    .filter(plugin => plugin.activation === 'enabled'
      && plugin.id !== CODEGRAPHY_MARKDOWN_PLUGIN_ID
      && !installedPluginIds.has(plugin.id))
    .map(plugin => plugin.id);

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: createDefaultStatusRuntimePlugins(activity.activePluginIds),
    packagePlugins: activity.packagePlugins.filter(plugin => plugin.host === 'core'),
    missingPackagePlugins,
  });
}

export function createDefaultStatusCorePluginIds(
  settings: CodeGraphyWorkspaceSettings,
  homeDir: string | undefined,
): ReadonlySet<string> {
  const installedPlugins = readCodeGraphyInstalledPluginCache({
    ...(homeDir ? { homeDir } : {}),
  }).plugins;
  const activity = createPluginActivityState({
    settings,
    installedPlugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const pluginIds = new Set(
    activity.packagePlugins
      .filter(plugin => plugin.host === 'core')
      .map(plugin => plugin.id),
  );
  if (activity.activePluginIds.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)) {
    pluginIds.add(CODEGRAPHY_MARKDOWN_PLUGIN_ID);
  }
  return pluginIds;
}

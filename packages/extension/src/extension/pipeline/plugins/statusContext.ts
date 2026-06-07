import * as fs from 'node:fs';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createBundledMarkdownInstalledPluginRecord,
  getWorkspaceSettingsPath,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';

export interface WorkspacePluginStatusContext {
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[];
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

function withBundledMarkdownPluginRecord(
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
): CodeGraphyInstalledPluginRecord[] {
  if (installedPlugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)) {
    return [...installedPlugins];
  }

  return [
    createBundledMarkdownInstalledPluginRecord(),
    ...installedPlugins,
  ];
}

export function readWorkspacePluginStatusContext(
  workspaceRoot: string | undefined,
  options: CodeGraphyUserStateOptions = {},
): WorkspacePluginStatusContext {
  const installedPlugins = withBundledMarkdownPluginRecord(
    readCodeGraphyInstalledPluginCache(options).plugins,
  );

  if (!workspaceRoot || !fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))) {
    return { installedPlugins };
  }

  const workspacePluginIds = readCodeGraphyWorkspaceSettings(workspaceRoot)
    .plugins
    .filter(plugin => plugin.enabled)
    .map(plugin => plugin.id);

  return {
    installedPlugins,
    workspaceEnabledPackageNames: new Set(workspacePluginIds),
  };
}

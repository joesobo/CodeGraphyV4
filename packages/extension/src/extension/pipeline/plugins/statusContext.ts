import * as fs from 'node:fs';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createBundledMarkdownInstalledPluginRecord,
  getWorkspaceSettingsPath,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy/core';

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

  return {
    installedPlugins,
    workspaceEnabledPackageNames: new Set(
      readCodeGraphyWorkspaceSettings(workspaceRoot).plugins.map(plugin => plugin.package),
    ),
  };
}

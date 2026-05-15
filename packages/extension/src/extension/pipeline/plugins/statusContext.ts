import * as fs from 'node:fs';
import {
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

export function readWorkspacePluginStatusContext(
  workspaceRoot: string | undefined,
  options: CodeGraphyUserStateOptions = {},
): WorkspacePluginStatusContext {
  const installedPlugins = readCodeGraphyInstalledPluginCache(options).plugins;

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

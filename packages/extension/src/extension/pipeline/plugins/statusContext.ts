import * as fs from 'node:fs';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  CORE_PLUGIN_API_VERSION,
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

function createWorkspaceEnabledPluginStatusRecord(packageName: string): CodeGraphyInstalledPluginRecord {
  return {
    package: packageName,
    version: 'unknown',
    apiVersion: CORE_PLUGIN_API_VERSION,
    disclosures: [],
    packageRoot: '',
  };
}

function withWorkspaceEnabledPluginRecords(
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
  workspacePluginPackages: readonly string[],
): CodeGraphyInstalledPluginRecord[] {
  const installedPackageNames = new Set(installedPlugins.map(plugin => plugin.package));
  const missingWorkspacePlugins: CodeGraphyInstalledPluginRecord[] = [];

  for (const packageName of workspacePluginPackages) {
    if (installedPackageNames.has(packageName)) {
      continue;
    }

    installedPackageNames.add(packageName);
    missingWorkspacePlugins.push(createWorkspaceEnabledPluginStatusRecord(packageName));
  }

  return [
    ...installedPlugins,
    ...missingWorkspacePlugins,
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

  const workspacePluginPackages = readCodeGraphyWorkspaceSettings(workspaceRoot).plugins.map(plugin => plugin.package);

  return {
    installedPlugins: withWorkspaceEnabledPluginRecords(installedPlugins, workspacePluginPackages),
    workspaceEnabledPackageNames: new Set(workspacePluginPackages),
  };
}

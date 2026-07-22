import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createBundledMarkdownInstalledPluginRecord,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettingsOrInitial,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';

export interface WorkspacePluginStatusContext {
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[];
  workspaceEnabledPluginIds?: ReadonlySet<string>;
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

  if (!workspaceRoot) {
    return { installedPlugins };
  }

  const workspacePluginIds = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot)
    .plugins
    .filter(plugin => plugin.activation !== 'disabled')
    .map(plugin => plugin.id);

  return {
    installedPlugins,
    workspaceEnabledPluginIds: new Set(workspacePluginIds),
  };
}

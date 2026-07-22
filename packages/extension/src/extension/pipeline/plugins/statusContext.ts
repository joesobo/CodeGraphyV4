import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createPluginActivityState,
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

  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const activity = createPluginActivityState({
    settings,
    installedPlugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });

  return {
    installedPlugins,
    workspaceEnabledPluginIds: activity.enabledPluginIds,
  };
}

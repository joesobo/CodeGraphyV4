import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createPluginActivityState,
  createBundledMarkdownInstalledPluginRecord,
  createInitialCodeGraphyWorkspaceSettings,
  preferBundledCodeGraphyPluginRecords,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettingsOrInitial,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';
import { readWorkspacePluginPackageRecords } from './bootstrap/bundledPackages';

export interface WorkspacePluginStatusContext {
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[];
  workspaceEnabledPluginIds?: ReadonlySet<string>;
}

export interface WorkspacePluginStatusContextOptions extends CodeGraphyUserStateOptions {
  bundledPackageRoots?: Iterable<string>;
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
  options: WorkspacePluginStatusContextOptions = {},
): WorkspacePluginStatusContext {
  const installedPlugins = preferBundledCodeGraphyPluginRecords(
    withBundledMarkdownPluginRecord(
      readCodeGraphyInstalledPluginCache(options).plugins,
    ),
    readWorkspacePluginPackageRecords(options.bundledPackageRoots ?? []),
  );

  const settings = workspaceRoot
    ? readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot)
    : createInitialCodeGraphyWorkspaceSettings();
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

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createPluginActivityState,
  createBundledMarkdownInstalledPluginRecord,
  createInitialCodeGraphyWorkspaceSettings,
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

function preferBundledPluginRecords(
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
  bundledPlugins: readonly CodeGraphyInstalledPluginRecord[],
): CodeGraphyInstalledPluginRecord[] {
  const activationByDescriptor = new Map(installedPlugins.map(plugin => [
    `${plugin.package}\u0000${plugin.id}`,
    plugin.globallyEnabled,
  ] as const));
  const bundledPackages = new Set(bundledPlugins.map(plugin => plugin.package));

  return [
    ...installedPlugins.filter(plugin => !bundledPackages.has(plugin.package)),
    ...bundledPlugins.map(plugin => ({
      ...plugin,
      globallyEnabled: activationByDescriptor.get(`${plugin.package}\u0000${plugin.id}`)
        ?? plugin.globallyEnabled,
    })),
  ];
}

export function readWorkspacePluginStatusContext(
  workspaceRoot: string | undefined,
  options: WorkspacePluginStatusContextOptions = {},
): WorkspacePluginStatusContext {
  const installedPlugins = preferBundledPluginRecords(
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

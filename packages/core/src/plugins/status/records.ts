import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type {
  WorkspaceIndexPluginStatus,
  WorkspaceIndexPluginStatusOptions,
} from './contracts';

type WorkspaceIndexPluginInfo = WorkspaceIndexPluginStatusOptions['pluginInfos'][number];

interface RegisteredPluginStatusOptions {
  connectionCount: number;
  disabledPlugins: ReadonlySet<string>;
  matchingFileCount: number;
  pluginInfo: WorkspaceIndexPluginInfo;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

function getWorkspaceIndexPluginWorkspaceStatus(
  matchingFileCount: number,
  totalConnections: number,
): WorkspaceIndexPluginStatus['status'] {
  if (matchingFileCount === 0) {
    return 'inactive';
  }

  return totalConnections > 0 ? 'active' : 'installed';
}

export function isUserFacingWorkspaceIndexPlugin(pluginInfo: WorkspaceIndexPluginInfo): boolean {
  return !pluginInfo.builtIn || !!pluginInfo.sourcePackage;
}

export function getRegisteredWorkspaceIndexPluginPackageNames(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
): Set<string> {
  const packageNames = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    if (pluginInfo.sourcePackage) {
      packageNames.add(pluginInfo.sourcePackage);
    }
  }

  return packageNames;
}

export function buildRegisteredWorkspaceIndexPluginStatus(
  options: RegisteredPluginStatusOptions,
): WorkspaceIndexPluginStatus {
  const {
    connectionCount,
    disabledPlugins,
    matchingFileCount,
    pluginInfo,
    workspaceEnabledPackageNames,
  } = options;
  const plugin = pluginInfo.plugin;

  return {
    id: plugin.id,
    ...(pluginInfo.sourcePackage ? { packageName: pluginInfo.sourcePackage } : {}),
    name: plugin.name,
    version: plugin.version,
    supportedExtensions: plugin.supportedExtensions,
    status: getWorkspaceIndexPluginWorkspaceStatus(matchingFileCount, connectionCount),
    enabled: pluginInfo.sourcePackage && workspaceEnabledPackageNames
      ? workspaceEnabledPackageNames.has(pluginInfo.sourcePackage)
      : !disabledPlugins.has(plugin.id),
    connectionCount,
  };
}

export function buildUnregisteredInstalledWorkspaceIndexPluginStatus(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceEnabledPackageNames?: ReadonlySet<string>,
): WorkspaceIndexPluginStatus {
  const enabled = workspaceEnabledPackageNames?.has(plugin.package) ?? false;

  return {
    id: plugin.pluginId ?? plugin.package,
    packageName: plugin.package,
    name: plugin.pluginName ?? plugin.package,
    version: plugin.version,
    supportedExtensions: plugin.supportedExtensions ?? [],
    status: enabled ? 'unavailable' : 'installed',
    enabled,
    connectionCount: 0,
  };
}

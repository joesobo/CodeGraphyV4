import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';
import type { IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus } from '../../../shared/plugins/status';

interface IRegisteredPluginStatusOptions {
  connectionCount: number;
  disabledPlugins: ReadonlySet<string>;
  matchingFileCount: number;
  pluginInfo: IPluginInfo;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

function getPluginWorkspaceStatus(
  matchingFileCount: number,
  totalConnections: number,
): IPluginStatus['status'] {
  if (matchingFileCount === 0) {
    return 'inactive';
  }

  return totalConnections > 0 ? 'active' : 'installed';
}

export function isUserFacingPlugin(pluginInfo: IPluginInfo): boolean {
  return !pluginInfo.builtIn || !!pluginInfo.sourcePackage;
}

export function getRegisteredPackageNames(pluginInfos: readonly IPluginInfo[]): Set<string> {
  const packageNames = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    if (pluginInfo.sourcePackage) {
      packageNames.add(pluginInfo.sourcePackage);
    }
  }

  return packageNames;
}

export function buildRegisteredPluginStatus(options: IRegisteredPluginStatusOptions): IPluginStatus {
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
    status: getPluginWorkspaceStatus(matchingFileCount, connectionCount),
    enabled: pluginInfo.sourcePackage && workspaceEnabledPackageNames
      ? workspaceEnabledPackageNames.has(pluginInfo.sourcePackage)
      : !disabledPlugins.has(plugin.id),
    connectionCount,
  };
}

export function buildUnregisteredInstalledPluginStatus(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceEnabledPackageNames?: ReadonlySet<string>,
): IPluginStatus {
  const enabled = workspaceEnabledPackageNames?.has(plugin.package) ?? false;

  return {
    id: plugin.package,
    packageName: plugin.package,
    name: plugin.package,
    version: plugin.version,
    supportedExtensions: [],
    status: enabled ? 'unavailable' : 'installed',
    enabled,
    connectionCount: 0,
  };
}

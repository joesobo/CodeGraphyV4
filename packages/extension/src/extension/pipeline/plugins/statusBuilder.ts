/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/pipeline/plugins/statusBuilder
 */

import * as path from 'path';
import type { CodeGraphyInstalledPluginRecord, IDiscoveredFile } from '@codegraphy/core';
import type { IProjectedConnection, IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus } from '../../../shared/plugins/status';

export interface IWorkspacePluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  pluginInfos: IPluginInfo[];
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

function supportsExtension(pluginExtensions: readonly string[], extension: string): boolean {
  return pluginExtensions.includes('*') || pluginExtensions.includes(extension);
}

function getPluginMatchingFiles(
  pluginInfo: IPluginInfo,
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[],
): Pick<IDiscoveredFile, 'relativePath'>[] {
  return discoveredFiles.filter((file) => {
    const extension = path.extname(file.relativePath).toLowerCase();
    return supportsExtension(pluginInfo.plugin.supportedExtensions, extension);
  });
}

function countPluginConnections(
  pluginInfo: IPluginInfo,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
): number {
  let totalConnections = 0;

  for (const [filePath, connections] of fileConnections) {
    const extension = path.extname(filePath).toLowerCase();
    if (!supportsExtension(pluginInfo.plugin.supportedExtensions, extension)) {
      continue;
    }

    for (const connection of connections) {
      if (connection.pluginId !== pluginInfo.plugin.id || !connection.resolvedPath) {
        continue;
      }

      totalConnections += 1;
    }
  }

  return totalConnections;
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

function isUserFacingPlugin(pluginInfo: IPluginInfo): boolean {
  return !pluginInfo.builtIn || !!pluginInfo.sourcePackage;
}

export function buildWorkspacePluginStatuses(options: IWorkspacePluginStatusOptions): IPluginStatus[] {
  const {
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    installedPlugins = [],
    pluginInfos,
    workspaceEnabledPackageNames,
  } = options;

  const statuses: IPluginStatus[] = [];
  const registeredPackageNames = new Set<string>();

  for (const pluginInfo of pluginInfos.filter(isUserFacingPlugin)) {
    const plugin = pluginInfo.plugin;
    const matchingFiles = getPluginMatchingFiles(pluginInfo, discoveredFiles);
    const totalConnections = countPluginConnections(pluginInfo, fileConnections);
    const status = getPluginWorkspaceStatus(matchingFiles.length, totalConnections);
    if (pluginInfo.sourcePackage) {
      registeredPackageNames.add(pluginInfo.sourcePackage);
    }

    statuses.push({
      id: plugin.id,
      ...(pluginInfo.sourcePackage ? { packageName: pluginInfo.sourcePackage } : {}),
      name: plugin.name,
      version: plugin.version,
      supportedExtensions: plugin.supportedExtensions,
      status,
      enabled: pluginInfo.sourcePackage && workspaceEnabledPackageNames
        ? workspaceEnabledPackageNames.has(pluginInfo.sourcePackage)
        : !disabledPlugins.has(plugin.id),
      connectionCount: totalConnections,
    });
  }

  for (const plugin of installedPlugins) {
    if (registeredPackageNames.has(plugin.package)) {
      continue;
    }

    const enabled = workspaceEnabledPackageNames?.has(plugin.package) ?? false;

    statuses.push({
      id: plugin.package,
      packageName: plugin.package,
      name: plugin.package,
      version: plugin.version,
      supportedExtensions: [],
      status: enabled ? 'unavailable' : 'installed',
      enabled,
      connectionCount: 0,
    });
  }

  return statuses;
}

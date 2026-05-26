/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/pipeline/plugins/statusBuilder
 */

import * as path from 'path';
import type { CodeGraphyInstalledPluginRecord, IDiscoveredFile } from '@codegraphy-dev/core';
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

function isRegisteredPackagePlugin(
  plugin: CodeGraphyInstalledPluginRecord,
  registeredPackageNames: ReadonlySet<string>,
): boolean {
  return registeredPackageNames.has(plugin.package);
}

function buildRegisteredPluginStatus(
  pluginInfo: IPluginInfo,
  options: Pick<IWorkspacePluginStatusOptions, 'disabledPlugins' | 'discoveredFiles' | 'fileConnections' | 'workspaceEnabledPackageNames'>,
): IPluginStatus {
  const matchingFiles = getPluginMatchingFiles(pluginInfo, options.discoveredFiles);
  const totalConnections = countPluginConnections(pluginInfo, options.fileConnections);
  const status = getPluginWorkspaceStatus(matchingFiles.length, totalConnections);
  const enabled = pluginInfo.sourcePackage && options.workspaceEnabledPackageNames
    ? options.workspaceEnabledPackageNames.has(pluginInfo.sourcePackage)
    : !options.disabledPlugins.has(pluginInfo.plugin.id);

  return {
    id: pluginInfo.plugin.id,
    ...(pluginInfo.sourcePackage ? { packageName: pluginInfo.sourcePackage } : {}),
    name: pluginInfo.plugin.name,
    version: pluginInfo.plugin.version,
    supportedExtensions: pluginInfo.plugin.supportedExtensions,
    status,
    enabled,
    connectionCount: totalConnections,
  };
}

function buildInstalledPackagePluginStatus(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceEnabledPackageNames: ReadonlySet<string> | undefined,
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

export function buildWorkspacePluginStatuses(options: IWorkspacePluginStatusOptions): IPluginStatus[] {
  const {
    installedPlugins = [],
    pluginInfos,
    workspaceEnabledPackageNames,
  } = options;

  const statuses: IPluginStatus[] = [];
  const registeredPackageNames = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    if (pluginInfo.sourcePackage) {
      registeredPackageNames.add(pluginInfo.sourcePackage);
    }

    statuses.push(buildRegisteredPluginStatus(pluginInfo, options));
  }

  for (const plugin of installedPlugins) {
    if (isRegisteredPackagePlugin(plugin, registeredPackageNames)) {
      continue;
    }

    statuses.push(buildInstalledPackagePluginStatus(plugin, workspaceEnabledPackageNames));
  }

  return statuses;
}

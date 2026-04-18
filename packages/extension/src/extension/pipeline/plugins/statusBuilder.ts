/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/pipeline/plugins/statusBuilder
 */

import * as path from 'path';
import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IProjectedConnection, IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus } from '../../../shared/plugins/status';

export interface IWorkspacePluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  pluginInfos: IPluginInfo[];
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

export function buildWorkspacePluginStatuses(options: IWorkspacePluginStatusOptions): IPluginStatus[] {
  const {
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    pluginInfos,
  } = options;

  const statuses: IPluginStatus[] = [];

  for (const pluginInfo of pluginInfos) {
    const plugin = pluginInfo.plugin;
    const matchingFiles = getPluginMatchingFiles(pluginInfo, discoveredFiles);
    const totalConnections = countPluginConnections(pluginInfo, fileConnections);
    const status = getPluginWorkspaceStatus(matchingFiles.length, totalConnections);

    statuses.push({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      supportedExtensions: plugin.supportedExtensions,
      status,
      enabled: !disabledPlugins.has(plugin.id),
      connectionCount: totalConnections,
    });
  }
  return statuses;
}

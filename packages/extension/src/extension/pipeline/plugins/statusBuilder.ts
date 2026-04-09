/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/pipeline/plugins/statusBuilder
 */

import * as path from 'path';
import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection, IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus } from '../../../shared/plugins/status';

export interface IWorkspacePluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IConnection[]>;
  pluginInfos: IPluginInfo[];
}

function supportsExtension(pluginExtensions: readonly string[], extension: string): boolean {
  return pluginExtensions.includes('*') || pluginExtensions.includes(extension);
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
    const matchingFiles = discoveredFiles.filter((file) => {
      const extension = path.extname(file.relativePath).toLowerCase();
      return supportsExtension(plugin.supportedExtensions, extension);
    });

    let totalConnections = 0;

    for (const [filePath, connections] of fileConnections) {
      const extension = path.extname(filePath).toLowerCase();
      if (!supportsExtension(plugin.supportedExtensions, extension)) {
        continue;
      }

      for (const connection of connections) {
        if (connection.pluginId !== plugin.id || !connection.resolvedPath) {
          continue;
        }

        totalConnections += 1;
      }
    }

    const status = matchingFiles.length === 0
      ? 'inactive'
      : totalConnections > 0
        ? 'active'
        : 'installed';

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

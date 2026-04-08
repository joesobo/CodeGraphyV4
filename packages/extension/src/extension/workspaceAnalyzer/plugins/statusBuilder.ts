/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/workspaceAnalyzer/plugins/statusBuilder
 */

import * as path from 'path';
import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection, IPlugin, IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus, IPluginRuleStatus } from '../../../shared/plugins/status';

export interface IWorkspacePluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IConnection[]>;
  pluginInfos: IPluginInfo[];
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export function buildWorkspacePluginStatuses(options: IWorkspacePluginStatusOptions): IPluginStatus[] {
  const {
    disabledPlugins,
    disabledSources,
    discoveredFiles,
    fileConnections,
    pluginInfos,
    workspaceRoot,
    getPluginForFile,
  } = options;

  const statuses: IPluginStatus[] = [];

  for (const pluginInfo of pluginInfos) {
    const plugin = pluginInfo.plugin;
    const matchingFiles = discoveredFiles.filter((file) => {
      const extension = path.extname(file.relativePath).toLowerCase();
      return plugin.supportedExtensions.includes(extension);
    });

    const ruleConnectionCounts = new Map<string, number>();
    let totalConnections = 0;

    for (const [filePath, connections] of fileConnections) {
      const filePlugin = getPluginForFile(path.join(workspaceRoot, filePath));
      if (filePlugin?.id !== plugin.id) {
        continue;
      }

      for (const connection of connections) {
        if (!connection.resolvedPath) {
          continue;
        }

        totalConnections += 1;
        if (connection.sourceId) {
          ruleConnectionCounts.set(
            connection.sourceId,
            (ruleConnectionCounts.get(connection.sourceId) ?? 0) + 1
          );
        }
      }
    }

    const status = matchingFiles.length === 0
      ? 'inactive'
      : totalConnections > 0
        ? 'active'
        : 'installed';

    const sources: IPluginRuleStatus[] = (plugin.sources ?? []).map((rule) => {
      const qualifiedSourceId = `${plugin.id}:${rule.id}`;

      return {
        id: rule.id,
        qualifiedSourceId,
        name: rule.name,
        description: rule.description,
        enabled: !disabledSources.has(qualifiedSourceId),
        connectionCount: ruleConnectionCounts.get(rule.id) ?? 0,
      };
    });

    statuses.push({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      supportedExtensions: plugin.supportedExtensions,
      status,
      enabled: !disabledPlugins.has(plugin.id),
      connectionCount: totalConnections,
      sources,
    });
  }

  statuses.sort((statusA, statusB) => statusA.name.localeCompare(statusB.name));
  return statuses;
}

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
  disabledRules: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IConnection[]>;
  pluginInfos: IPluginInfo[];
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export function buildWorkspacePluginStatuses(options: IWorkspacePluginStatusOptions): IPluginStatus[] {
  const {
    disabledPlugins,
    disabledRules,
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
        if (connection.ruleId) {
          ruleConnectionCounts.set(
            connection.ruleId,
            (ruleConnectionCounts.get(connection.ruleId) ?? 0) + 1
          );
        }
      }
    }

    const status = matchingFiles.length === 0
      ? 'inactive'
      : totalConnections > 0
        ? 'active'
        : 'installed';

    const rules: IPluginRuleStatus[] = (plugin.rules ?? []).map((rule) => {
      const qualifiedId = `${plugin.id}:${rule.id}`;

      return {
        id: rule.id,
        qualifiedId,
        name: rule.name,
        description: rule.description,
        enabled: !disabledRules.has(qualifiedId),
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
      rules,
    });
  }

  statuses.sort((statusA, statusB) => statusA.name.localeCompare(statusB.name));
  return statuses;
}

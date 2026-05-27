/**
 * @fileoverview Plugin status calculation helpers for workspace analysis.
 * @module extension/pipeline/plugins/statusBuilder
 */

import type { CodeGraphyInstalledPluginRecord, IDiscoveredFile } from '@codegraphy-dev/core';
import type { IProjectedConnection, IPluginInfo } from '../../../core/plugins/types/contracts';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { countPluginConnections } from './connectionCounts';
import { getPluginMatchingFiles } from './extensions';
import {
  buildRegisteredPluginStatus,
  buildUnregisteredInstalledPluginStatus,
  getRegisteredPackageNames,
  isUserFacingPlugin,
} from './statusRecords';

export interface IWorkspacePluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[];
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  pluginInfos: IPluginInfo[];
  workspaceEnabledPackageNames?: ReadonlySet<string>;
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
  const registeredPackageNames = getRegisteredPackageNames(pluginInfos);

  for (const pluginInfo of pluginInfos.filter(isUserFacingPlugin)) {
    const matchingFiles = getPluginMatchingFiles(pluginInfo, discoveredFiles);
    const totalConnections = countPluginConnections(pluginInfo, fileConnections);

    statuses.push(buildRegisteredPluginStatus({
      connectionCount: totalConnections,
      disabledPlugins,
      matchingFileCount: matchingFiles.length,
      pluginInfo,
      workspaceEnabledPackageNames,
    }));
  }

  for (const plugin of installedPlugins) {
    if (registeredPackageNames.has(plugin.package)) {
      continue;
    }

    statuses.push(buildUnregisteredInstalledPluginStatus(plugin, workspaceEnabledPackageNames));
  }

  return statuses;
}

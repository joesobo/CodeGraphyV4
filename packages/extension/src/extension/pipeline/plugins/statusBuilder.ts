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

  const registeredPackageStatuses = new Map<string, IPluginStatus>();
  const registeredStatusesInPluginOrder: IPluginStatus[] = [];

  for (const pluginInfo of pluginInfos.filter(isUserFacingPlugin)) {
    const matchingFiles = getPluginMatchingFiles(pluginInfo, discoveredFiles);
    const totalConnections = countPluginConnections(pluginInfo, fileConnections);

    const status = buildRegisteredPluginStatus({
      connectionCount: totalConnections,
      disabledPlugins,
      matchingFileCount: matchingFiles.length,
      pluginInfo,
      workspaceEnabledPackageNames,
    });
    registeredStatusesInPluginOrder.push(status);

    if (pluginInfo.sourcePackage) {
      registeredPackageStatuses.set(pluginInfo.sourcePackage, status);
    }
  }

  if (installedPlugins.length === 0) {
    return registeredStatusesInPluginOrder;
  }

  const statuses: IPluginStatus[] = [];
  const installedPackageNames = new Set(installedPlugins.map(plugin => plugin.package));

  for (const installedPlugin of installedPlugins) {
    const registeredStatus = registeredPackageStatuses.get(installedPlugin.package);
    if (registeredStatus) {
      statuses.push(registeredStatus);
      continue;
    }

    statuses.push(buildUnregisteredInstalledPluginStatus(installedPlugin, workspaceEnabledPackageNames));
  }

  for (const status of registeredStatusesInPluginOrder) {
    if (status.packageName && installedPackageNames.has(status.packageName)) {
      continue;
    }
    statuses.push(status);
  }

  return statuses;
}

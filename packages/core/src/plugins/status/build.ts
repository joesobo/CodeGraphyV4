import type {
  WorkspaceIndexPluginStatus,
  WorkspaceIndexPluginStatusOptions,
} from './contracts';
import { countWorkspaceIndexPluginConnections } from './connectionCounts';
import { getWorkspaceIndexPluginMatchingFiles } from './extensions';
import {
  buildRegisteredWorkspaceIndexPluginStatus,
  buildUnregisteredInstalledWorkspaceIndexPluginStatus,
  isUserFacingWorkspaceIndexPlugin,
} from './records';

function shouldReplaceDuplicateWorkspaceIndexPluginStatus(
  existing: WorkspaceIndexPluginStatus,
  next: WorkspaceIndexPluginStatus,
): boolean {
  if (existing.enabled !== next.enabled) {
    return next.enabled;
  }

  if (existing.status === 'unavailable' && next.status !== 'unavailable') {
    return true;
  }

  return false;
}

function dedupeWorkspaceIndexPluginStatuses(
  statuses: readonly WorkspaceIndexPluginStatus[],
): WorkspaceIndexPluginStatus[] {
  const deduped: WorkspaceIndexPluginStatus[] = [];
  const indexById = new Map<string, number>();

  for (const status of statuses) {
    const existingIndex = indexById.get(status.id);
    if (existingIndex === undefined) {
      indexById.set(status.id, deduped.length);
      deduped.push(status);
      continue;
    }

    const existing = deduped[existingIndex];
    if (shouldReplaceDuplicateWorkspaceIndexPluginStatus(existing, status)) {
      deduped[existingIndex] = status;
    }
  }

  return deduped;
}

export function buildWorkspaceIndexPluginStatuses(
  options: WorkspaceIndexPluginStatusOptions,
): WorkspaceIndexPluginStatus[] {
  const {
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    installedPlugins = [],
    pluginInfos,
    workspaceEnabledPackageNames,
  } = options;

  const registeredPackageStatuses = new Map<string, WorkspaceIndexPluginStatus>();
  const registeredStatusesInPluginOrder: WorkspaceIndexPluginStatus[] = [];

  for (const pluginInfo of pluginInfos.filter(isUserFacingWorkspaceIndexPlugin)) {
    const matchingFiles = getWorkspaceIndexPluginMatchingFiles(pluginInfo, discoveredFiles);
    const totalConnections = countWorkspaceIndexPluginConnections(pluginInfo, fileConnections);
    const status = buildRegisteredWorkspaceIndexPluginStatus({
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
    return dedupeWorkspaceIndexPluginStatuses(registeredStatusesInPluginOrder);
  }

  const statuses: WorkspaceIndexPluginStatus[] = [];
  const installedPackageNames = new Set(installedPlugins.map(plugin => plugin.package));

  for (const installedPlugin of installedPlugins) {
    const registeredStatus = registeredPackageStatuses.get(installedPlugin.package);
    if (registeredStatus) {
      statuses.push(registeredStatus);
      continue;
    }

    statuses.push(buildUnregisteredInstalledWorkspaceIndexPluginStatus(
      installedPlugin,
      workspaceEnabledPackageNames,
    ));
  }

  for (const status of registeredStatusesInPluginOrder) {
    if (status.packageName && installedPackageNames.has(status.packageName)) {
      continue;
    }
    statuses.push(status);
  }

  return dedupeWorkspaceIndexPluginStatuses(statuses);
}

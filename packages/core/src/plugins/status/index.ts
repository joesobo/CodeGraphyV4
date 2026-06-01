import * as path from 'path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type { CorePluginInfo } from '../registry';

export interface WorkspaceIndexPluginStatus {
  id: string;
  packageName?: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  status: 'active' | 'installed' | 'inactive' | 'unavailable';
  enabled: boolean;
  connectionCount: number;
}

export interface WorkspaceIndexPluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Array<{ relativePath: string }>;
  fileConnections: ReadonlyMap<string, Array<{ pluginId?: string; resolvedPath?: string | null }>>;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  pluginInfos: Array<{
    builtIn: boolean;
    plugin: {
      id: string;
      name: string;
      version: string;
      supportedExtensions: string[];
    };
    sourcePackage?: string;
  }>;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

type WorkspaceIndexPluginInfo = WorkspaceIndexPluginStatusOptions['pluginInfos'][number];

interface RegisteredPluginStatusOptions {
  connectionCount: number;
  disabledPlugins: ReadonlySet<string>;
  matchingFileCount: number;
  pluginInfo: WorkspaceIndexPluginInfo;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

function getWorkspaceIndexPluginWorkspaceStatus(
  matchingFileCount: number,
  totalConnections: number,
): WorkspaceIndexPluginStatus['status'] {
  if (matchingFileCount === 0) {
    return 'inactive';
  }

  return totalConnections > 0 ? 'active' : 'installed';
}

export function supportsWorkspaceIndexPluginExtension(
  pluginExtensions: readonly string[],
  extension: string,
): boolean {
  return pluginExtensions.includes('*') || pluginExtensions.includes(extension);
}

export function getWorkspaceIndexPluginMatchingFiles(
  pluginInfo: Pick<WorkspaceIndexPluginInfo, 'plugin'>,
  discoveredFiles: Array<{ relativePath: string }>,
): Array<{ relativePath: string }> {
  return discoveredFiles.filter((file) => {
    const extension = path.extname(file.relativePath).toLowerCase();
    return supportsWorkspaceIndexPluginExtension(pluginInfo.plugin.supportedExtensions, extension);
  });
}

export function countWorkspaceIndexPluginConnections(
  pluginInfo: Pick<WorkspaceIndexPluginInfo, 'plugin'>,
  fileConnections: ReadonlyMap<string, Array<{ pluginId?: string; resolvedPath?: string | null }>>,
): number {
  let totalConnections = 0;

  for (const [filePath, connections] of fileConnections) {
    const extension = path.extname(filePath).toLowerCase();
    if (!supportsWorkspaceIndexPluginExtension(pluginInfo.plugin.supportedExtensions, extension)) {
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

export function isUserFacingWorkspaceIndexPlugin(pluginInfo: WorkspaceIndexPluginInfo): boolean {
  return !pluginInfo.builtIn || !!pluginInfo.sourcePackage;
}

export function getRegisteredWorkspaceIndexPluginPackageNames(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
): Set<string> {
  const packageNames = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    if (pluginInfo.sourcePackage) {
      packageNames.add(pluginInfo.sourcePackage);
    }
  }

  return packageNames;
}

export function buildRegisteredWorkspaceIndexPluginStatus(
  options: RegisteredPluginStatusOptions,
): WorkspaceIndexPluginStatus {
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
    status: getWorkspaceIndexPluginWorkspaceStatus(matchingFileCount, connectionCount),
    enabled: pluginInfo.sourcePackage && workspaceEnabledPackageNames
      ? workspaceEnabledPackageNames.has(pluginInfo.sourcePackage)
      : !disabledPlugins.has(plugin.id),
    connectionCount,
  };
}

export function buildUnregisteredInstalledWorkspaceIndexPluginStatus(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceEnabledPackageNames?: ReadonlySet<string>,
): WorkspaceIndexPluginStatus {
  const enabled = workspaceEnabledPackageNames?.has(plugin.package) ?? false;

  return {
    id: plugin.pluginId ?? plugin.package,
    packageName: plugin.package,
    name: plugin.pluginName ?? plugin.package,
    version: plugin.version,
    supportedExtensions: plugin.supportedExtensions ?? [],
    status: enabled ? 'unavailable' : 'installed',
    enabled,
    connectionCount: 0,
  };
}

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

interface WorkspaceIndexPluginRegistry {
  getPluginForFile(filePath: string): IPlugin | undefined;
  list(): CorePluginInfo[];
}

export interface WorkspaceIndexPluginStatusDependencies
  extends Omit<WorkspaceIndexPluginStatusOptions, 'pluginInfos'> {
  registry: WorkspaceIndexPluginRegistry;
}

export function getWorkspaceIndexPluginStatuses(
  dependencies: WorkspaceIndexPluginStatusDependencies,
): WorkspaceIndexPluginStatus[] {
  return buildWorkspaceIndexPluginStatuses({
    disabledPlugins: dependencies.disabledPlugins,
    discoveredFiles: dependencies.discoveredFiles,
    fileConnections: dependencies.fileConnections,
    installedPlugins: dependencies.installedPlugins,
    pluginInfos: dependencies.registry.list(),
    workspaceEnabledPackageNames: dependencies.workspaceEnabledPackageNames,
  });
}

export function getWorkspaceIndexPluginNameForFile(
  relativePath: string,
  workspaceRoot: string,
  registry: Pick<WorkspaceIndexPluginRegistry, 'getPluginForFile'>,
): string | undefined {
  return registry.getPluginForFile(path.join(workspaceRoot, relativePath))?.name;
}

export function resolveWorkspaceIndexPluginNameForFile(
  relativePath: string,
  lastWorkspaceRoot: string,
  getWorkspaceRoot: () => string | undefined,
  registry: Pick<WorkspaceIndexPluginRegistry, 'getPluginForFile'>,
): string | undefined {
  const workspaceRoot = lastWorkspaceRoot || getWorkspaceRoot();
  if (!workspaceRoot) {
    return undefined;
  }

  return getWorkspaceIndexPluginNameForFile(
    relativePath,
    workspaceRoot,
    registry,
  );
}

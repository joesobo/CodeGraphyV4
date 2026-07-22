import * as path from 'path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';
import type { CorePluginInfo } from '../registry';
import {
  getWorkspaceIndexPluginMatchingFiles,
  supportsWorkspaceIndexPluginExtension,
} from './extensions';

export {
  getWorkspaceIndexPluginMatchingFiles,
  supportsWorkspaceIndexPluginExtension,
} from './extensions';

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
    runtimeActive?: boolean;
    sourcePackage?: string;
  }>;
  workspaceEnabledPluginIds?: ReadonlySet<string>;
}

type WorkspaceIndexPluginInfo = WorkspaceIndexPluginStatusOptions['pluginInfos'][number];

interface RegisteredPluginStatusOptions {
  connectionCount: number;
  disabledPlugins: ReadonlySet<string>;
  matchingFileCount: number;
  pluginInfo: WorkspaceIndexPluginInfo;
  workspaceEnabledPluginIds?: ReadonlySet<string>;
}

interface RegisteredWorkspaceIndexPluginStatuses {
  byPluginId: Map<string, WorkspaceIndexPluginStatus>;
  inPluginOrder: WorkspaceIndexPluginStatus[];
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
    workspaceEnabledPluginIds,
  } = options;
  const plugin = pluginInfo.plugin;

  return {
    id: plugin.id,
    ...(pluginInfo.sourcePackage ? { packageName: pluginInfo.sourcePackage } : {}),
    name: plugin.name,
    version: plugin.version,
    supportedExtensions: plugin.supportedExtensions,
    status: pluginInfo.runtimeActive
      ? 'active'
      : getWorkspaceIndexPluginWorkspaceStatus(matchingFileCount, connectionCount),
    enabled: pluginInfo.sourcePackage
      ? workspaceEnabledPluginIds?.has(plugin.id) ?? false
      : !disabledPlugins.has(plugin.id),
    connectionCount,
  };
}

export function buildUnregisteredInstalledWorkspaceIndexPluginStatus(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceEnabledPluginIds?: ReadonlySet<string>,
): WorkspaceIndexPluginStatus {
  const id = plugin.id;
  const enabled = workspaceEnabledPluginIds?.has(id) ?? false;
  const name = plugin.name ?? plugin.package;

  return {
    id,
    packageName: plugin.package,
    name,
    version: plugin.version,
    supportedExtensions: [],
    status: enabled ? 'unavailable' : 'installed',
    enabled,
    connectionCount: 0,
  };
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
    const shouldReplace = existing.enabled !== status.enabled
      ? status.enabled
      : existing.status === 'unavailable' && status.status !== 'unavailable';
    if (shouldReplace) {
      deduped[existingIndex] = status;
    }
  }

  return deduped;
}

function buildRegisteredWorkspaceIndexPluginStatuses(
  options: WorkspaceIndexPluginStatusOptions,
): RegisteredWorkspaceIndexPluginStatuses {
  const byPluginId = new Map<string, WorkspaceIndexPluginStatus>();
  const inPluginOrder: WorkspaceIndexPluginStatus[] = [];

  for (const pluginInfo of options.pluginInfos.filter(isUserFacingWorkspaceIndexPlugin)) {
    const matchingFiles = getWorkspaceIndexPluginMatchingFiles(pluginInfo, options.discoveredFiles);
    const connectionCount = countWorkspaceIndexPluginConnections(pluginInfo, options.fileConnections);
    const status = buildRegisteredWorkspaceIndexPluginStatus({
      connectionCount,
      disabledPlugins: options.disabledPlugins,
      matchingFileCount: matchingFiles.length,
      pluginInfo,
      workspaceEnabledPluginIds: options.workspaceEnabledPluginIds,
    });

    inPluginOrder.push(status);

    byPluginId.set(pluginInfo.plugin.id, status);
  }

  return { byPluginId, inPluginOrder };
}

function appendInstalledWorkspaceIndexPluginStatuses(
  statuses: WorkspaceIndexPluginStatus[],
  installedPlugins: readonly CodeGraphyInstalledPluginRecord[],
  registeredByPluginId: ReadonlyMap<string, WorkspaceIndexPluginStatus>,
  workspaceEnabledPluginIds?: ReadonlySet<string>,
): void {
  for (const installedPlugin of installedPlugins) {
    statuses.push(
      registeredByPluginId.get(installedPlugin.id)
      ?? buildUnregisteredInstalledWorkspaceIndexPluginStatus(
        installedPlugin,
        workspaceEnabledPluginIds,
      ),
    );
  }
}

function appendUninstalledRegisteredWorkspaceIndexPluginStatuses(
  statuses: WorkspaceIndexPluginStatus[],
  registeredStatuses: readonly WorkspaceIndexPluginStatus[],
  installedPluginIds: ReadonlySet<string>,
): void {
  for (const status of registeredStatuses) {
    if (!installedPluginIds.has(status.id)) {
      statuses.push(status);
    }
  }
}

export function buildWorkspaceIndexPluginStatuses(
  options: WorkspaceIndexPluginStatusOptions,
): WorkspaceIndexPluginStatus[] {
  const installedPlugins = options.installedPlugins ?? [];
  const registered = buildRegisteredWorkspaceIndexPluginStatuses(options);

  if (installedPlugins.length === 0) {
    return dedupeWorkspaceIndexPluginStatuses(registered.inPluginOrder);
  }

  const statuses: WorkspaceIndexPluginStatus[] = [];
  const installedPluginIds = new Set(installedPlugins.map(plugin => plugin.id));
  appendInstalledWorkspaceIndexPluginStatuses(
    statuses,
    installedPlugins,
    registered.byPluginId,
    options.workspaceEnabledPluginIds,
  );
  appendUninstalledRegisteredWorkspaceIndexPluginStatuses(
    statuses,
    registered.inPluginOrder,
    installedPluginIds,
  );

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
    workspaceEnabledPluginIds: dependencies.workspaceEnabledPluginIds,
  });
}

export function getWorkspaceIndexPluginNameForFile(
  relativePath: string,
  workspaceRoot: string,
  registry: Pick<WorkspaceIndexPluginRegistry, 'getPluginForFile'>,
): string | undefined {
  const plugin = registry.getPluginForFile(path.join(workspaceRoot, relativePath));
  return plugin?.name;
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

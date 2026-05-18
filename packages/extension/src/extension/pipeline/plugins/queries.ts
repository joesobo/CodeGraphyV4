import * as path from 'path';
import type { CodeGraphyInstalledPluginRecord, IDiscoveredFile } from '@codegraphy/core';
import type { IProjectedConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { buildWorkspacePluginStatuses } from './statusBuilder';

interface WorkspacePipelinePluginRegistry {
  getPluginForFile(filePath: string): IPlugin | undefined;
  list(): ReturnType<PluginRegistry['list']>;
}

export interface WorkspacePipelinePluginStatusDependencies {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: IDiscoveredFile[];
  fileConnections: Map<string, IProjectedConnection[]>;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  registry: WorkspacePipelinePluginRegistry;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

export function getWorkspacePipelinePluginStatuses(
  dependencies: WorkspacePipelinePluginStatusDependencies,
): IPluginStatus[] {
  return buildWorkspacePluginStatuses({
    disabledPlugins: dependencies.disabledPlugins,
    discoveredFiles: dependencies.discoveredFiles,
    fileConnections: dependencies.fileConnections,
    installedPlugins: dependencies.installedPlugins,
    pluginInfos: dependencies.registry.list(),
    workspaceEnabledPackageNames: dependencies.workspaceEnabledPackageNames,
  });
}

export function getWorkspacePipelinePluginNameForFile(
  relativePath: string,
  workspaceRoot: string,
  registry: Pick<WorkspacePipelinePluginRegistry, 'getPluginForFile'>,
): string | undefined {
  return registry.getPluginForFile(path.join(workspaceRoot, relativePath))?.name;
}

export function resolveWorkspacePipelinePluginNameForFile(
  relativePath: string,
  lastWorkspaceRoot: string,
  getWorkspaceRoot: () => string | undefined,
  registry: Pick<WorkspacePipelinePluginRegistry, 'getPluginForFile'>,
): string | undefined {
  const workspaceRoot = lastWorkspaceRoot || getWorkspaceRoot();
  if (!workspaceRoot) {
    return undefined;
  }

  return getWorkspacePipelinePluginNameForFile(
    relativePath,
    workspaceRoot,
    registry,
  );
}

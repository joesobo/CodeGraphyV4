import type * as vscode from 'vscode';
import type { IProjectedConnection } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { CodeGraphyInstalledPluginRecord, IDiscoveredFile } from '@codegraphy/core';
import type { IPluginStatus } from '../../../../shared/plugins/status';
import {
  getWorkspacePipelinePluginStatuses,
  resolveWorkspacePipelinePluginNameForFile,
} from '../../plugins/queries';
import { readWorkspacePipelineRoot } from '../../serviceAdapters';

export interface WorkspacePipelineStatusListOptions {
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}

export function getWorkspacePipelineStatusList(
  registry: PluginRegistry,
  disabledPlugins: Set<string>,
  discoveredFiles: IDiscoveredFile[],
  fileConnections: Map<string, IProjectedConnection[]>,
  options: WorkspacePipelineStatusListOptions = {},
): IPluginStatus[] {
  return getWorkspacePipelinePluginStatuses({
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    installedPlugins: options.installedPlugins,
    registry,
    workspaceEnabledPackageNames: options.workspaceEnabledPackageNames,
  });
}

export function getWorkspacePipelinePluginName(
  relativePath: string,
  cachedWorkspaceRoot: string,
  registry: PluginRegistry,
  workspaceFolders: typeof vscode.workspace.workspaceFolders,
): string | undefined {
  return resolveWorkspacePipelinePluginNameForFile(
    relativePath,
    cachedWorkspaceRoot,
    () => readWorkspacePipelineRoot(workspaceFolders),
    registry,
  );
}

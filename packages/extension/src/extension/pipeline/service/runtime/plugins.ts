import type * as vscode from 'vscode';
import type { IProjectedConnection } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import {
  buildWorkspaceIndexPluginStatuses,
  type CodeGraphyInstalledPluginRecord,
  type IDiscoveredFile,
  type WorkspaceIndexPluginStatusOptions,
} from '@codegraphy-dev/core';
import type { IPluginStatus } from '../../../../shared/plugins/status';
import {
  resolveWorkspacePipelinePluginNameForFile,
} from '../../plugins/queries';
import { readWorkspacePipelineRoot } from '../../serviceAdapters';

export interface WorkspacePipelineStatusListOptions {
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  workspaceEnabledPluginIds?: ReadonlySet<string>;
}

export function getWorkspacePipelineStatusList(
  registry: PluginRegistry,
  disabledPlugins: Set<string>,
  discoveredFiles: IDiscoveredFile[],
  fileConnections: Map<string, IProjectedConnection[]>,
  options: WorkspacePipelineStatusListOptions = {},
): IPluginStatus[] {
  const extensionPluginInfos: WorkspaceIndexPluginStatusOptions['pluginInfos'] = registry
    .extensionPlugins
    .listActive()
    .map(info => ({
      builtIn: info.builtIn,
      plugin: {
        id: info.plugin.id,
        name: info.plugin.name,
        version: info.plugin.version,
        supportedExtensions: [],
      },
      runtimeActive: true,
      ...(info.sourcePackage ? { sourcePackage: info.sourcePackage } : {}),
    }));

  return buildWorkspaceIndexPluginStatuses({
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    installedPlugins: options.installedPlugins,
    pluginInfos: [
      ...registry.list(),
      ...extensionPluginInfos,
    ],
    workspaceEnabledPluginIds: options.workspaceEnabledPluginIds,
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

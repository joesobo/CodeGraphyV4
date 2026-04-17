import type * as vscode from 'vscode';
import type { IProjectedConnection } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IDiscoveredFile } from '../../../../core/discovery/contracts';
import type { IPluginStatus } from '../../../../shared/plugins/status';
import {
  getWorkspacePipelinePluginStatuses,
  resolveWorkspacePipelinePluginNameForFile,
} from '../../plugins/queries';
import { readWorkspacePipelineRoot } from '../../serviceAdapters';

export function getWorkspacePipelineStatusList(
  registry: PluginRegistry,
  disabledPlugins: Set<string>,
  discoveredFiles: IDiscoveredFile[],
  fileConnections: Map<string, IProjectedConnection[]>,
): IPluginStatus[] {
  return getWorkspacePipelinePluginStatuses({
    disabledPlugins,
    discoveredFiles,
    fileConnections,
    registry,
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

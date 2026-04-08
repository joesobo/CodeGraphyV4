import * as path from 'path';
import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { buildWorkspacePluginStatuses } from './statusBuilder';

interface WorkspacePipelinePluginRegistry {
  getPluginForFile(filePath: string): IPlugin | undefined;
  list(): ReturnType<PluginRegistry['list']>;
}

export interface WorkspacePipelinePluginStatusDependencies {
  disabledPlugins: ReadonlySet<string>;
  disabledSources: ReadonlySet<string>;
  discoveredFiles: IDiscoveredFile[];
  fileConnections: Map<string, IConnection[]>;
  registry: WorkspacePipelinePluginRegistry;
}

export function getWorkspacePipelinePluginStatuses(
  dependencies: WorkspacePipelinePluginStatusDependencies,
): IPluginStatus[] {
  return buildWorkspacePluginStatuses({
    disabledPlugins: dependencies.disabledPlugins,
    disabledSources: dependencies.disabledSources,
    discoveredFiles: dependencies.discoveredFiles,
    fileConnections: dependencies.fileConnections,
    pluginInfos: dependencies.registry.list(),
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

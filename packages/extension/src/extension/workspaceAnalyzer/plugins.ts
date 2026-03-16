import * as path from 'path';
import type { IDiscoveredFile } from '../../core/discovery';
import type { IConnection, IPlugin, PluginRegistry } from '../../core/plugins';
import type { IPluginStatus } from '../../shared/types';
import { buildWorkspacePluginStatuses } from '../workspacePluginStatuses';

interface WorkspaceAnalyzerPluginRegistry {
  getPluginForFile(filePath: string): IPlugin | undefined;
  list(): ReturnType<PluginRegistry['list']>;
}

export interface WorkspaceAnalyzerPluginStatusDependencies {
  disabledPlugins: ReadonlySet<string>;
  disabledRules: ReadonlySet<string>;
  discoveredFiles: IDiscoveredFile[];
  fileConnections: Map<string, IConnection[]>;
  registry: WorkspaceAnalyzerPluginRegistry;
  workspaceRoot: string;
}

export function getWorkspaceAnalyzerPluginStatuses(
  dependencies: WorkspaceAnalyzerPluginStatusDependencies,
): IPluginStatus[] {
  return buildWorkspacePluginStatuses({
    disabledPlugins: dependencies.disabledPlugins,
    disabledRules: dependencies.disabledRules,
    discoveredFiles: dependencies.discoveredFiles,
    fileConnections: dependencies.fileConnections,
    pluginInfos: dependencies.registry.list(),
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: absolutePath =>
      dependencies.registry.getPluginForFile(absolutePath),
  });
}

export function getWorkspaceAnalyzerPluginNameForFile(
  relativePath: string,
  workspaceRoot: string,
  registry: Pick<WorkspaceAnalyzerPluginRegistry, 'getPluginForFile'>,
): string | undefined {
  return registry.getPluginForFile(path.join(workspaceRoot, relativePath))?.name;
}

export function resolveWorkspaceAnalyzerPluginNameForFile(
  relativePath: string,
  lastWorkspaceRoot: string,
  getWorkspaceRoot: () => string | undefined,
  registry: Pick<WorkspaceAnalyzerPluginRegistry, 'getPluginForFile'>,
): string | undefined {
  const workspaceRoot = lastWorkspaceRoot || getWorkspaceRoot();
  if (!workspaceRoot) {
    return undefined;
  }

  return getWorkspaceAnalyzerPluginNameForFile(
    relativePath,
    workspaceRoot,
    registry,
  );
}

import * as path from 'path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from '../registry';
import type {
  WorkspaceIndexPluginStatus,
  WorkspaceIndexPluginStatusOptions,
} from './contracts';
import { buildWorkspaceIndexPluginStatuses } from './build';

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

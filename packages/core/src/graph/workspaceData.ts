import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IGraphData } from './contracts';
import { buildWorkspaceGraphEdges } from './edges';
import { buildWorkspaceGraphNodes } from './nodes';

export interface IWorkspaceGraphDataOptions {
  cacheFiles: Record<string, { size?: number }>;
  directoryPaths?: readonly string[];
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  gitIgnoredPaths?: readonly string[];
  showOrphans: boolean;
  workspaceRoot: string;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
}

export function buildWorkspaceGraphData(options: IWorkspaceGraphDataOptions): IGraphData {
  const { connectedIds, edges, nodeIds } = buildWorkspaceGraphEdges({
    disabledPlugins: options.disabledPlugins,
    fileConnections: options.fileConnections,
    getPluginForFile: options.getPluginForFile,
    workspaceRoot: options.workspaceRoot,
  });
  const nodes = buildWorkspaceGraphNodes({
    cacheFiles: options.cacheFiles,
    connectedIds,
    directoryPaths: options.directoryPaths ?? [],
    gitIgnoredPaths: options.gitIgnoredPaths ?? [],
    nodeIds,
    showOrphans: options.showOrphans,
  });
  return { nodes, edges };
}

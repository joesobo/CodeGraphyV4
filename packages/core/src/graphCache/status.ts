import * as fs from 'node:fs';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';

export type GraphCacheState = 'missing' | 'available';

export interface GraphCacheStatus {
  workspaceRoot: string;
  graphCachePath: string;
  state: GraphCacheState;
}

export interface GraphCacheStatusDependencies {
  exists(filePath: string): boolean;
}

const DEFAULT_DEPENDENCIES: GraphCacheStatusDependencies = {
  exists: fs.existsSync,
};

export function readGraphCacheStatus(
  workspaceRoot: string,
  dependencies: GraphCacheStatusDependencies = DEFAULT_DEPENDENCIES,
): GraphCacheStatus {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const graphCachePath = getGraphCachePath(resolvedWorkspaceRoot);

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    graphCachePath,
    state: dependencies.exists(graphCachePath) ? 'available' : 'missing',
  };
}

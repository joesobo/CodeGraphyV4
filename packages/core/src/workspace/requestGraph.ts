import * as path from 'node:path';
import { inspectWorkspaceAnalysisDatabase } from '../graphCache/database/storage';
import type { IGraphData } from '../graph/contracts';
import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
} from '../plugins/installedCache';
import { deriveVisibleGraph } from '../visibleGraph';
import { readWorkspaceQueryGraph } from './queryGraph';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { WorkspaceGraphQueryProjection, WorkspacePathInput } from './requestTypes';
import { readCodeGraphyWorkspaceStatus } from './status';

export interface WorkspaceGraphInput extends WorkspacePathInput {
  projection?: WorkspaceGraphQueryProjection;
}

export type WorkspaceGraphResult =
  | {
      kind: 'missing';
      workspaceRoot: string;
      graphCache: string;
    }
  | {
      kind: 'unreadable';
      workspaceRoot: string;
      graphCache: string;
      message: string;
    }
  | {
      kind: 'ready';
      workspaceRoot: string;
      graphCache: string;
      cacheStatus: {
        state: 'fresh' | 'stale';
        staleReasons: string[];
      };
      graph: IGraphData;
    };

export interface WorkspaceGraphDependencies {
  cwd(): string;
  readInstalledPluginCache(): CodeGraphyInstalledPluginCache;
}

const DEFAULT_DEPENDENCIES: WorkspaceGraphDependencies = {
  cwd: () => process.cwd(),
  readInstalledPluginCache: () => readCodeGraphyInstalledPluginCache(),
};

/**
 * Loads the saved, Core-shaped Relationship Graph without running Indexing.
 */
export function requestCodeGraphyWorkspaceGraph(
  input: WorkspaceGraphInput,
  dependencies: WorkspaceGraphDependencies = DEFAULT_DEPENDENCIES,
): WorkspaceGraphResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  const graphCache = path.relative(workspaceRoot, status.graphCachePath);
  if (!status.hasGraphCache) {
    return { kind: 'missing', workspaceRoot, graphCache };
  }

  const inspection = inspectWorkspaceAnalysisDatabase(workspaceRoot);
  if (!inspection.ok) {
    return {
      kind: 'unreadable',
      workspaceRoot,
      graphCache,
      message: inspection.message ?? 'The Graph Cache could not be read safely.',
    };
  }

  const projected = readWorkspaceQueryGraph(
    workspaceRoot,
    dependencies.readInstalledPluginCache(),
    input.projection,
  );
  const graph = deriveVisibleGraph(projected.graphData, {
    scope: {
      nodes: Object.entries(projected.scope.nodes).map(([type, enabled]) => ({ type, enabled })),
      edges: Object.entries(projected.scope.edges).map(([type, enabled]) => ({ type, enabled })),
      nodeTypes: projected.nodeTypes,
    },
    showOrphans: true,
  }).graphData;

  return {
    kind: 'ready',
    workspaceRoot,
    graphCache,
    cacheStatus: {
      state: status.state === 'stale' ? 'stale' : 'fresh',
      staleReasons: status.staleReasons,
    },
    graph,
  };
}

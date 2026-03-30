import type { IConnection } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/types';
import {
  createEmptyWorkspaceAnalysisCache,
  saveWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../cache';

export interface WorkspaceAnalyzerRebuildDependencies {
  buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledRules: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  fileConnections: Map<string, IConnection[]>;
  workspaceRoot: string;
}

export interface WorkspaceAnalyzerRebuildSource {
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledRules: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
}

export function rebuildWorkspaceAnalyzerGraph(
  dependencies: WorkspaceAnalyzerRebuildDependencies,
  disabledRules: Set<string>,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  if (dependencies.fileConnections.size === 0) {
    return { nodes: [], edges: [] };
  }

  return dependencies.buildGraphData(
    dependencies.fileConnections,
    dependencies.workspaceRoot,
    showOrphans,
    disabledRules,
    disabledPlugins,
  );
}

export function rebuildWorkspaceAnalyzerGraphForSource(
  source: WorkspaceAnalyzerRebuildSource,
  disabledRules: Set<string>,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  return rebuildWorkspaceAnalyzerGraph(
    {
      buildGraphData: (
        fileConnections,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ) =>
        source._buildGraphData(
          fileConnections,
          workspaceRoot,
          nextShowOrphans,
          nextDisabledRules,
          nextDisabledPlugins,
        ),
      fileConnections: source._lastFileConnections,
      workspaceRoot: source._lastWorkspaceRoot,
    },
    disabledRules,
    disabledPlugins,
    showOrphans,
  );
}

export function clearWorkspaceAnalyzerCache(
  workspaceState: {
    update(key: string, value: unknown): PromiseLike<void>;
  },
  logInfo: (message: string) => void,
): IWorkspaceAnalysisCache {
  const cache = createEmptyWorkspaceAnalysisCache();
  saveWorkspaceAnalysisCache(workspaceState.update.bind(workspaceState), cache);
  logInfo('[CodeGraphy] Cache cleared');
  return cache;
}

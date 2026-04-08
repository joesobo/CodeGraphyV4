import type { IConnection } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/types';
import {
  createEmptyWorkspaceAnalysisCache,
  saveWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../cache';

export interface WorkspacePipelineRebuildDependencies {
  buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  fileConnections: Map<string, IConnection[]>;
  workspaceRoot: string;
}

export interface WorkspacePipelineRebuildSource {
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
}

export function rebuildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineRebuildDependencies,
  disabledSources: Set<string>,
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
    disabledSources,
    disabledPlugins,
  );
}

export function rebuildWorkspacePipelineGraphForSource(
  source: WorkspacePipelineRebuildSource,
  disabledSources: Set<string>,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  return rebuildWorkspacePipelineGraph(
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
    disabledSources,
    disabledPlugins,
    showOrphans,
  );
}

export function clearWorkspacePipelineCache(
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

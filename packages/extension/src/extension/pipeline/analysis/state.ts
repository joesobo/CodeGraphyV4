import type { IProjectedConnection, IFileAnalysisResult } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../cache';
import { clearWorkspaceAnalysisDatabaseCache } from '../database/cache';

export interface WorkspacePipelineRebuildDependencies {
  buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
  workspaceRoot: string;
}

export interface WorkspacePipelineRebuildSource {
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IProjectedConnection[]>;
  _lastWorkspaceRoot: string;
}

export function rebuildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineRebuildDependencies,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  if (dependencies.fileAnalysis.size > 0) {
    return dependencies.buildGraphDataFromAnalysis(
      dependencies.fileAnalysis,
      dependencies.workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  if (dependencies.fileConnections.size === 0) {
    return { nodes: [], edges: [] };
  }

  return dependencies.buildGraphData(
    dependencies.fileConnections,
    dependencies.workspaceRoot,
    showOrphans,
    disabledPlugins,
  );
}

export function rebuildWorkspacePipelineGraphForSource(
  source: WorkspacePipelineRebuildSource,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  return rebuildWorkspacePipelineGraph(
    {
      buildGraphDataFromAnalysis: (
        fileAnalysis,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledPlugins,
      ) =>
        source._buildGraphDataFromAnalysis(
          fileAnalysis,
          workspaceRoot,
          nextShowOrphans,
          nextDisabledPlugins,
        ),
      buildGraphData: (
        fileConnections,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledPlugins,
      ) =>
        source._buildGraphData(
          fileConnections,
          workspaceRoot,
          nextShowOrphans,
          nextDisabledPlugins,
        ),
      fileAnalysis: source._lastFileAnalysis,
      fileConnections: source._lastFileConnections,
      workspaceRoot: source._lastWorkspaceRoot,
    },
    disabledPlugins,
    showOrphans,
  );
}

export function clearWorkspacePipelineCache(
  workspaceRoot: string | undefined,
  logInfo: (message: string) => void,
): IWorkspaceAnalysisCache {
  const cache = createEmptyWorkspaceAnalysisCache();
  if (workspaceRoot) {
    clearWorkspaceAnalysisDatabaseCache(workspaceRoot);
  }
  logInfo('[CodeGraphy] Cache cleared');
  return cache;
}

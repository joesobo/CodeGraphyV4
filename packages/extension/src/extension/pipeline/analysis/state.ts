import type { IConnection, IFileAnalysisResult } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/types';
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
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IConnection[]>;
  workspaceRoot: string;
}

export interface WorkspacePipelineRebuildSource {
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
}

export function rebuildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineRebuildDependencies,
  disabledSources: Set<string>,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  if (dependencies.fileAnalysis.size > 0) {
    return dependencies.buildGraphDataFromAnalysis(
      dependencies.fileAnalysis,
      dependencies.workspaceRoot,
      showOrphans,
      disabledSources,
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
      buildGraphDataFromAnalysis: (
        fileAnalysis,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ) =>
        source._buildGraphDataFromAnalysis(
          fileAnalysis,
          workspaceRoot,
          nextShowOrphans,
          nextDisabledRules,
          nextDisabledPlugins,
        ),
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
      fileAnalysis: source._lastFileAnalysis,
      fileConnections: source._lastFileConnections,
      workspaceRoot: source._lastWorkspaceRoot,
    },
    disabledSources,
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

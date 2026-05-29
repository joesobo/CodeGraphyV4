import type * as vscode from 'vscode';
import type { IFileAnalysisResult, IProjectedConnection } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IWorkspaceAnalysisCache } from '../../cache';
import {
  buildWorkspacePipelineGraphData,
  buildWorkspacePipelineGraphDataFromAnalysis,
  type WorkspacePipelineGraphScopeOptions,
} from '../../serviceAdapters';

export function buildWorkspacePipelineGraph(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileConnections: Map<string, IProjectedConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string>,
  directoryPaths: readonly string[] = [],
): IGraphData {
  return buildWorkspacePipelineGraphData(
    cache,
    context,
    registry,
    fileConnections,
    workspaceRoot,
    showOrphans,
    disabledPlugins,
    directoryPaths,
  );
}

export function buildWorkspacePipelineGraphFromAnalysis(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileAnalysis: Map<string, IFileAnalysisResult>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string>,
  directoryPaths: readonly string[] = [],
  graphScope: WorkspacePipelineGraphScopeOptions = {},
): IGraphData {
  return buildWorkspacePipelineGraphDataFromAnalysis(
    cache,
    context,
    registry,
    fileAnalysis,
    workspaceRoot,
    showOrphans,
    disabledPlugins,
    directoryPaths,
    graphScope,
  );
}

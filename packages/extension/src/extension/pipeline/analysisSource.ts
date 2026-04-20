import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../core/plugins/types/contracts';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { EventBus } from '../../core/plugins/events/bus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { FileDiscovery } from '../../core/discovery/file/service';
import type * as vscode from 'vscode';
import type { IWorkspaceAnalysisCache } from './cache';
import type { IGraphData } from '../../shared/graph/contracts';
import type { WorkspacePipelineAnalysisSource } from './analysis/analyze';
import type { WorkspacePipelineRebuildSource } from './analysis/state';
import type { IWorkspaceFileAnalysisResult } from './fileAnalysis';
export interface WorkspacePipelineSourceOwner {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    nextSignal?: AbortSignal,
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    nextDisabledRules: Set<string>,
    nextDisabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    nextDisabledRules: Set<string>,
    nextDisabledPlugins: Set<string>,
  ): IGraphData;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    nextSignal?: AbortSignal,
  ): Promise<void>;
  _eventBus?: EventBus;
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IProjectedConnection[]>;
  _lastWorkspaceRoot: string;
  _cache: IWorkspaceAnalysisCache;
  _discovery: FileDiscovery;
  _registry: PluginRegistry;
  _context: vscode.ExtensionContext;
  getPluginFilterPatterns(disabledPlugins?: ReadonlySet<string>): string[];
}

export function createWorkspacePipelineAnalysisSource(
  owner: WorkspacePipelineSourceOwner,
): WorkspacePipelineAnalysisSource {
  const source = {
    _analyzeFiles: (
      files: IDiscoveredFile[],
      workspaceRoot: string,
      onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
      nextSignal?: AbortSignal,
    ) => owner._analyzeFiles(files, workspaceRoot, onProgress, nextSignal),
    _buildGraphData: (
      fileConnections: Map<string, IProjectedConnection[]>,
      workspaceRoot: string,
      showOrphans: boolean,
      nextDisabledRules: Set<string>,
      nextDisabledPlugins: Set<string>,
    ) =>
      owner._buildGraphData(
        fileConnections,
        workspaceRoot,
        showOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ),
    _buildGraphDataFromAnalysis: (
      fileAnalysis: Map<string, IFileAnalysisResult>,
      workspaceRoot: string,
      showOrphans: boolean,
      nextDisabledRules: Set<string>,
      nextDisabledPlugins: Set<string>,
    ) =>
      owner._buildGraphDataFromAnalysis(
        fileAnalysis,
        workspaceRoot,
        showOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ),
    _preAnalyzePlugins: (
      files: IDiscoveredFile[],
      workspaceRoot: string,
      nextSignal?: AbortSignal,
    ) => owner._preAnalyzePlugins(files, workspaceRoot, nextSignal),
    getPluginFilterPatterns: (disabledPlugins?: ReadonlySet<string>) =>
      owner.getPluginFilterPatterns(disabledPlugins),
  } as WorkspacePipelineAnalysisSource;

  Object.defineProperties(source, {
    _eventBus: {
      get: () => owner._eventBus,
    },
    _lastDiscoveredFiles: {
      get: () => owner._lastDiscoveredFiles,
      set: (files: IDiscoveredFile[]) => {
        owner._lastDiscoveredFiles = files;
      },
    },
    _lastFileConnections: {
      get: () => owner._lastFileConnections,
      set: (fileConnections: Map<string, IProjectedConnection[]>) => {
        owner._lastFileConnections = fileConnections;
      },
    },
    _lastFileAnalysis: {
      get: () => owner._lastFileAnalysis,
      set: (fileAnalysis: Map<string, IFileAnalysisResult>) => {
        owner._lastFileAnalysis = fileAnalysis;
      },
    },
    _lastWorkspaceRoot: {
      get: () => owner._lastWorkspaceRoot,
      set: (workspaceRoot: string) => {
        owner._lastWorkspaceRoot = workspaceRoot;
      },
    },
  });

  return source;
}

export function createWorkspacePipelineRebuildSource(
  owner: WorkspacePipelineSourceOwner,
): WorkspacePipelineRebuildSource {
  const source = {
    _buildGraphDataFromAnalysis: (
      fileAnalysis: Map<string, IFileAnalysisResult>,
      workspaceRoot: string,
      nextShowOrphans: boolean,
      nextDisabledRules: Set<string>,
      nextDisabledPlugins: Set<string>,
    ) =>
      owner._buildGraphDataFromAnalysis(
        fileAnalysis,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ),
    _buildGraphData: (
      fileConnections: Map<string, IProjectedConnection[]>,
      workspaceRoot: string,
      nextShowOrphans: boolean,
      nextDisabledRules: Set<string>,
      nextDisabledPlugins: Set<string>,
    ) =>
      owner._buildGraphData(
        fileConnections,
        workspaceRoot,
        nextShowOrphans,
        nextDisabledRules,
        nextDisabledPlugins,
      ),
  } as WorkspacePipelineRebuildSource;

  Object.defineProperties(source, {
    _lastFileAnalysis: {
      get: () => owner._lastFileAnalysis,
    },
    _lastFileConnections: {
      get: () => owner._lastFileConnections,
    },
    _lastWorkspaceRoot: {
      get: () => owner._lastWorkspaceRoot,
    },
  });

  return source;
}

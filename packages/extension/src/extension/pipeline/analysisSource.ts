import type { IConnection } from '../../core/plugins/types/contracts';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { EventBus } from '../../core/plugins/events/bus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { FileDiscovery } from '../../core/discovery/file/service';
import type * as vscode from 'vscode';
import type { IWorkspaceAnalysisCache } from './cache';
import type { IGraphData } from '../../shared/graph/types';
import type { WorkspacePipelineAnalysisSource } from './analysis/analyze';
import type { WorkspacePipelineRebuildSource } from './analysis/state';
export interface WorkspacePipelineSourceOwner {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    nextSignal?: AbortSignal,
  ): Promise<Map<string, IConnection[]>>;
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
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
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
  _cache: IWorkspaceAnalysisCache;
  _discovery: FileDiscovery;
  _registry: PluginRegistry;
  _context: vscode.ExtensionContext;
  getPluginFilterPatterns(): string[];
}

export function createWorkspacePipelineAnalysisSource(
  owner: WorkspacePipelineSourceOwner,
): WorkspacePipelineAnalysisSource {
  const source = {
    _analyzeFiles: (
      files: IDiscoveredFile[],
      workspaceRoot: string,
      nextSignal?: AbortSignal,
    ) => owner._analyzeFiles(files, workspaceRoot, nextSignal),
    _buildGraphData: (
      fileConnections: Map<string, IConnection[]>,
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
    _preAnalyzePlugins: (
      files: IDiscoveredFile[],
      workspaceRoot: string,
      nextSignal?: AbortSignal,
    ) => owner._preAnalyzePlugins(files, workspaceRoot, nextSignal),
    getPluginFilterPatterns: () => owner.getPluginFilterPatterns(),
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
      set: (fileConnections: Map<string, IConnection[]>) => {
        owner._lastFileConnections = fileConnections;
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
    _buildGraphData: (
      fileConnections: Map<string, IConnection[]>,
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
    _lastFileConnections: {
      get: () => owner._lastFileConnections,
    },
    _lastWorkspaceRoot: {
      get: () => owner._lastWorkspaceRoot,
    },
  });

  return source;
}

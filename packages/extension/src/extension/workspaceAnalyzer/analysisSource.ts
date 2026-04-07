import type { IConnection } from '../../core/plugins/types/contracts';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { EventBus } from '../../core/plugins/eventBus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { FileDiscovery } from '../../core/discovery/file/service';
import type * as vscode from 'vscode';
import type { IWorkspaceAnalysisCache } from './cache';
import type { IGraphData } from '../../shared/graph/types';
import type { WorkspaceAnalyzerAnalysisSource } from './analysis/analyze';
import type { WorkspaceAnalyzerRebuildSource } from './analysis/state';
export interface WorkspaceAnalyzerSourceOwner {
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

export function createWorkspaceAnalyzerAnalysisSource(
  owner: WorkspaceAnalyzerSourceOwner,
): WorkspaceAnalyzerAnalysisSource {
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
  } as WorkspaceAnalyzerAnalysisSource;

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

export function createWorkspaceAnalyzerRebuildSource(
  owner: WorkspaceAnalyzerSourceOwner,
): WorkspaceAnalyzerRebuildSource {
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
  } as WorkspaceAnalyzerRebuildSource;

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

import type * as vscode from 'vscode';
import type { IDiscoveredFile } from '@codegraphy/core';
import type { FileDiscovery } from '@codegraphy/core';
import type { EventBus } from '../../core/plugins/events/bus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { IFileAnalysisResult, IProjectedConnection } from '../../core/plugins/types/contracts';
import type { IGraphData } from '../../shared/graph/contracts';
import { getCachedGitHistoryChurnCounts } from '../gitHistory/cache/state';
import { createGitHistoryPluginSignature } from '../gitHistory/pluginSignature';
import type { IWorkspaceAnalysisCache } from './cache';
import type { IWorkspaceFileAnalysisResult } from './fileAnalysis';
import {
  analyzeWorkspacePipelineSourceFiles,
  type WorkspacePipelineFilesSource,
} from './analysis/files';
import { preAnalyzeWorkspacePipelineFiles } from './analysis/preAnalyze';
import {
  buildWorkspacePipelineGraphFromAnalysis,
  buildWorkspacePipelineGraphForSource,
  type WorkspacePipelineGraphSource,
} from './graph/build';
import {
  getWorkspacePipelineFileStat,
  getWorkspacePipelineRoot,
} from './io';

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  registry: Pick<PluginRegistry, 'notifyPreAnalyze'>,
  discovery: Pick<FileDiscovery, 'readContent'>,
  signal?: AbortSignal,
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(
    files,
    workspaceRoot,
    {
      notifyPreAnalyze: (v2Files, rootPath) =>
        registry.notifyPreAnalyze(v2Files, rootPath),
      readContent: file => discovery.readContent(file),
    },
    signal,
  );
}

export function analyzeWorkspacePipelineFiles(
  cache: IWorkspaceAnalysisCache,
  discovery: FileDiscovery,
  eventBus: EventBus | undefined,
  registry: PluginRegistry,
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
  signal?: AbortSignal,
): Promise<IWorkspaceFileAnalysisResult> {
  const source: WorkspacePipelineFilesSource = {
    _cache: cache,
    _discovery: discovery,
    _eventBus: eventBus,
    _getFileStat: getFileStat,
    _registry: registry,
  };

  return analyzeWorkspacePipelineSourceFiles(
    source,
    files,
    workspaceRoot,
    message => {
      console.log(message);
    },
    onProgress,
    signal,
  );
}

export function buildWorkspacePipelineGraphData(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileConnections: Map<string, IProjectedConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
  directoryPaths: readonly string[] = [],
): IGraphData {
  const source: WorkspacePipelineGraphSource = {
    _cache: cache,
    _lastDiscoveredDirectories: directoryPaths,
    _registry: registry,
  };
  const churnCounts = getCachedGitHistoryChurnCounts(
    context.workspaceState,
    createGitHistoryPluginSignature(registry),
  ) ?? {};

  return buildWorkspacePipelineGraphForSource(
    source,
    fileConnections,
    workspaceRoot,
    showOrphans,
    disabledPlugins,
    churnCounts,
  );
}

export function buildWorkspacePipelineGraphDataFromAnalysis(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileAnalysis: Map<string, IFileAnalysisResult>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
  directoryPaths: readonly string[] = [],
): IGraphData {
  const source: WorkspacePipelineGraphSource = {
    _cache: cache,
    _lastDiscoveredDirectories: directoryPaths,
    _registry: registry,
  };
  const churnCounts = getCachedGitHistoryChurnCounts(
    context.workspaceState,
    createGitHistoryPluginSignature(registry),
  ) ?? {};

  return buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: source._cache.files,
    churnCounts,
    directoryPaths: source._lastDiscoveredDirectories ?? [],
    disabledPlugins,
    fileAnalysis,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
  });
}

export function readWorkspacePipelineRoot(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  return getWorkspacePipelineRoot(workspaceFolders);
}

export function readWorkspacePipelineFileStat(
  filePath: string,
  fileSystem: vscode.FileSystem,
): Promise<{ mtime: number; size: number } | null> {
  return getWorkspacePipelineFileStat(filePath, fileSystem);
}

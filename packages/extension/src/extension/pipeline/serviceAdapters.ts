import type * as vscode from 'vscode';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { preAnalyzeCoreTreeSitterFiles } from '@codegraphy-dev/core';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { EventBus } from '../../core/plugins/events/bus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { IFileAnalysisResult, IProjectedConnection } from '../../core/plugins/types/contracts';
import type { IGraphData } from '../../shared/graph/contracts';
import { readCachedChurn } from '../churn/cache';
import type { IWorkspaceAnalysisCache } from './cache';
import type { AnalysisCacheTierOptions, IWorkspaceFileAnalysisResult } from './fileAnalysis';
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

export interface WorkspacePipelineGraphScopeOptions {
  nodeVisibility?: Readonly<Record<string, boolean>>;
}

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  registry: Pick<PluginRegistry, 'notifyPreAnalyze'>,
  discovery: Pick<FileDiscovery, 'readContent'>,
  signal?: AbortSignal,
  disabledPlugins: Set<string> = new Set(),
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(
    files,
    workspaceRoot,
    {
      notifyPreAnalyze: async (v2Files, rootPath) => {
        await preAnalyzeCoreTreeSitterFiles(v2Files, rootPath);
        await registry.notifyPreAnalyze(v2Files, rootPath, undefined, disabledPlugins);
      },
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
  cacheTiers?: AnalysisCacheTierOptions,
  pluginIds?: readonly string[],
  disabledPlugins: Set<string> = new Set(),
  options?: { forceAnalyze?: boolean },
): Promise<IWorkspaceFileAnalysisResult> {
  const source: WorkspacePipelineFilesSource = {
    _cache: cache,
    _discovery: discovery,
    _eventBus: eventBus,
    _getFileStat: getFileStat,
    _preAnalyzePlugins: (preAnalyzeFiles, rootPath, abortSignal) =>
      preAnalyzeWorkspacePipelinePlugins(
        preAnalyzeFiles,
        rootPath,
        registry,
        discovery,
        abortSignal,
        disabledPlugins,
      ),
    _registry: registry,
  };

  const args = [
    source,
    files,
    workspaceRoot,
    (message: string) => {
      console.log(message);
    },
    onProgress,
    signal,
    cacheTiers,
    pluginIds,
    disabledPlugins,
  ] as const;

  return options
    ? analyzeWorkspacePipelineSourceFiles(...args, options)
    : analyzeWorkspacePipelineSourceFiles(...args);
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
  gitIgnoredPaths: readonly string[] = [],
): IGraphData {
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const effectiveDisabledPlugins = new Set(disabledPlugins);
  for (const connections of fileConnections.values()) {
    for (const connection of connections) {
      if (connection.pluginId && !activePluginIds.has(connection.pluginId)) {
        effectiveDisabledPlugins.add(connection.pluginId);
      }
    }
  }
  const source: WorkspacePipelineGraphSource = {
    _cache: cache,
    _lastDiscoveredDirectories: directoryPaths,
    _lastGitIgnoredPaths: gitIgnoredPaths,
    _registry: registry,
  };
  return buildWorkspacePipelineGraphForSource(
    source,
    fileConnections,
    workspaceRoot,
    showOrphans,
    effectiveDisabledPlugins,
    readCachedChurn(context.workspaceState) ?? {},
  );
}

function readWorkspacePipelineMetadataString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readWorkspacePipelineSymbolPluginId(
  symbol: NonNullable<IFileAnalysisResult['symbols']>[number],
): string | undefined {
  return readWorkspacePipelineMetadataString(symbol.metadata?.pluginId)
    ?? readWorkspacePipelineMetadataString(symbol.metadata?.source);
}

function isWorkspacePipelinePluginActive(
  pluginId: string | undefined,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return !pluginId || (activePluginIds.has(pluginId) && !disabledPlugins.has(pluginId));
}

function filterWorkspacePipelineRelationsByActivePlugins(
  relations: NonNullable<IFileAnalysisResult['relations']>,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): NonNullable<IFileAnalysisResult['relations']> {
  return relations.filter(relation =>
    isWorkspacePipelinePluginActive(relation.pluginId, activePluginIds, disabledPlugins),
  );
}

function filterWorkspacePipelineSymbolsByActivePlugins(
  symbols: NonNullable<IFileAnalysisResult['symbols']>,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): NonNullable<IFileAnalysisResult['symbols']> {
  return symbols.filter(symbol =>
    isWorkspacePipelinePluginActive(
      readWorkspacePipelineSymbolPluginId(symbol),
      activePluginIds,
      disabledPlugins,
    ),
  );
}

function filterWorkspacePipelineAnalysisByActivePlugins(
  fileAnalysis: Map<string, IFileAnalysisResult>,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): Map<string, IFileAnalysisResult> {
  const filtered = new Map<string, IFileAnalysisResult>();

  for (const [filePath, analysis] of fileAnalysis.entries()) {
    const relations = analysis.relations ?? [];
    const activeRelations = filterWorkspacePipelineRelationsByActivePlugins(
      relations,
      activePluginIds,
      disabledPlugins,
    );
    const symbols = analysis.symbols ?? [];
    const activeSymbols = filterWorkspacePipelineSymbolsByActivePlugins(
      symbols,
      activePluginIds,
      disabledPlugins,
    );
    const unchanged = activeRelations.length === relations.length
      && activeSymbols.length === symbols.length;

    filtered.set(
      filePath,
      unchanged
        ? analysis
        : { ...analysis, relations: activeRelations, symbols: activeSymbols },
    );
  }

  return filtered;
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
  graphScope: WorkspacePipelineGraphScopeOptions = {},
  gitIgnoredPaths: readonly string[] = [],
): IGraphData {
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const visibleFileAnalysis = filterWorkspacePipelineAnalysisByActivePlugins(
    fileAnalysis,
    activePluginIds,
    disabledPlugins,
  );
  const source: WorkspacePipelineGraphSource = {
    _cache: cache,
    _lastDiscoveredDirectories: directoryPaths,
    _lastGitIgnoredPaths: gitIgnoredPaths,
    _registry: registry,
  };
  return buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: source._cache.files,
    churnCounts: readCachedChurn(context.workspaceState) ?? {},
    directoryPaths: source._lastDiscoveredDirectories ?? [],
    gitIgnoredPaths: source._lastGitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: visibleFileAnalysis,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    nodeVisibility: graphScope.nodeVisibility,
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

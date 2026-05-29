import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../discovery/contracts';
import { analyzeWorkspaceFiles } from './fileAnalysis';
import type {
  AnalysisCacheTierOptions,
  IWorkspaceFileAnalysisResult,
  IWorkspaceFileProcessedPayload,
} from './fileAnalysis';
import type { IWorkspaceAnalysisCache } from './cache';
import type { WorkspacePipelineEventBus } from './workspaceAnalyze';

export interface WorkspacePipelineFilesDependencies {
  analyzeFile: (
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ) => Promise<IFileAnalysisResult>;
  cache: IWorkspaceAnalysisCache;
  cacheTiers?: AnalysisCacheTierOptions;
  emitFileProcessed?: (payload: IWorkspaceFileProcessedPayload) => void;
  files: IDiscoveredFile[];
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
  logInfo(message: string): void;
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void;
  readContent: (file: IDiscoveredFile) => Promise<string>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface WorkspacePipelineFilesSource {
  _cache: IWorkspaceAnalysisCache;
  _discovery: {
    readContent(file: IDiscoveredFile): Promise<string>;
  };
  _eventBus?: Pick<WorkspacePipelineEventBus, 'emit'>;
  _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null>;
  _registry: {
    analyzeFileResult(
      absolutePath: string,
      content: string,
      workspaceRoot: string,
    ): Promise<IFileAnalysisResult | null>;
    analyzeFileResultForPlugins?(
      absolutePath: string,
      content: string,
      workspaceRoot: string,
      pluginIds: readonly string[],
    ): Promise<IFileAnalysisResult | null>;
  };
}

function analyzeWorkspacePipelineFileWithRegistry(
  source: WorkspacePipelineFilesSource,
  absolutePath: string,
  content: string,
  workspaceRoot: string,
  pluginIds: readonly string[] | undefined,
): Promise<IFileAnalysisResult | null> {
  if (pluginIds && pluginIds.length > 0 && source._registry.analyzeFileResultForPlugins) {
    return source._registry.analyzeFileResultForPlugins(
      absolutePath,
      content,
      workspaceRoot,
      pluginIds,
    );
  }

  return source._registry.analyzeFileResult(absolutePath, content, workspaceRoot);
}

export async function analyzeWorkspacePipelineFiles(
  dependencies: WorkspacePipelineFilesDependencies,
): Promise<IWorkspaceFileAnalysisResult> {
  const result = await analyzeWorkspaceFiles({
    analyzeFile: dependencies.analyzeFile,
    cache: dependencies.cache,
    cacheTiers: dependencies.cacheTiers,
    emitFileProcessed: dependencies.emitFileProcessed,
    files: dependencies.files,
    getFileStat: dependencies.getFileStat,
    onProgress: dependencies.onProgress,
    readContent: dependencies.readContent,
    signal: dependencies.signal,
    workspaceRoot: dependencies.workspaceRoot,
  });

  dependencies.logInfo(
    `[CodeGraphy] Analysis: ${result.cacheHits} cache hits, ${result.cacheMisses} misses`,
  );
  return result;
}

export async function analyzeWorkspacePipelineSourceFiles(
  source: WorkspacePipelineFilesSource,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  logInfo: (message: string) => void,
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
  signal?: AbortSignal,
  cacheTiers?: AnalysisCacheTierOptions,
  pluginIds?: readonly string[],
): Promise<IWorkspaceFileAnalysisResult> {
  const eventBus = source._eventBus;

  return analyzeWorkspacePipelineFiles({
    analyzeFile: (absolutePath, content, rootPath) =>
      analyzeWorkspacePipelineFileWithRegistry(
        source,
        absolutePath,
        content,
        rootPath,
        pluginIds,
      ).then(result => result ?? ({
        filePath: absolutePath,
        relations: [],
      })),
    cache: source._cache,
    cacheTiers,
    emitFileProcessed: eventBus
      ? payload => eventBus.emit('analysis:fileProcessed', payload)
      : undefined,
    files,
    getFileStat: filePath => source._getFileStat(filePath),
    logInfo,
    onProgress,
    readContent: file => source._discovery.readContent(file),
    signal,
    workspaceRoot,
  });
}

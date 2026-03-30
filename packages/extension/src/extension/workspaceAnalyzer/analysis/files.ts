import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection } from '../../../core/plugins/types/contracts';
import type { EventBus } from '../../../core/plugins/eventBus';
import { analyzeWorkspaceFiles } from '../fileAnalysis';
import type { IWorkspaceFileProcessedPayload } from '../fileAnalysis';
import type { IWorkspaceAnalysisCache } from '../cache';

export interface WorkspaceAnalyzerFilesDependencies {
  analyzeFile: (
    absolutePath: string,
    content: string,
    workspaceRoot: string,
  ) => Promise<IConnection[]>;
  cache: IWorkspaceAnalysisCache;
  emitFileProcessed?: (payload: IWorkspaceFileProcessedPayload) => void;
  files: IDiscoveredFile[];
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
  logInfo(message: string): void;
  readContent: (file: IDiscoveredFile) => Promise<string>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface WorkspaceAnalyzerFilesSource {
  _cache: IWorkspaceAnalysisCache;
  _discovery: {
    readContent(file: IDiscoveredFile): Promise<string>;
  };
  _eventBus?: Pick<EventBus, 'emit'>;
  _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null>;
  _registry: {
    analyzeFile(
      absolutePath: string,
      content: string,
      workspaceRoot: string,
    ): Promise<IConnection[]>;
  };
}

export async function analyzeWorkspaceAnalyzerFiles(
  dependencies: WorkspaceAnalyzerFilesDependencies,
): Promise<Map<string, IConnection[]>> {
  const result = await analyzeWorkspaceFiles({
    analyzeFile: dependencies.analyzeFile,
    cache: dependencies.cache,
    emitFileProcessed: dependencies.emitFileProcessed,
    files: dependencies.files,
    getFileStat: dependencies.getFileStat,
    readContent: dependencies.readContent,
    signal: dependencies.signal,
    workspaceRoot: dependencies.workspaceRoot,
  });

  dependencies.logInfo(
    `[CodeGraphy] Analysis: ${result.cacheHits} cache hits, ${result.cacheMisses} misses`,
  );
  return result.fileConnections;
}

export async function analyzeWorkspaceAnalyzerSourceFiles(
  source: WorkspaceAnalyzerFilesSource,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  logInfo: (message: string) => void,
  signal?: AbortSignal,
): Promise<Map<string, IConnection[]>> {
  const eventBus = source._eventBus;

  return analyzeWorkspaceAnalyzerFiles({
    analyzeFile: (absolutePath, content, rootPath) =>
      source._registry.analyzeFile(absolutePath, content, rootPath),
    cache: source._cache,
    emitFileProcessed: eventBus
      ? payload => eventBus.emit('analysis:fileProcessed', payload)
      : undefined,
    files,
    getFileStat: filePath => source._getFileStat(filePath),
    logInfo,
    readContent: file => source._discovery.readContent(file),
    signal,
    workspaceRoot,
  });
}

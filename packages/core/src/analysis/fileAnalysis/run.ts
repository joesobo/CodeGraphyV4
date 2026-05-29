import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../discovery/contracts';
import type { IProjectedConnection } from '../projectedConnection';
import { throwIfWorkspaceAnalysisAborted } from '../abort';
import {
  projectConnectionMapFromFileAnalysis,
  projectProjectedConnectionsFromFileAnalysis,
} from '../projection';
import {
  hasRequiredAnalysisCacheTiers,
  markAnalysisCacheTiers,
  projectAnalysisForCacheTiers,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from './cacheTiers';
import { enrichWorkspaceFileAnalysis } from './enrichment';
import type {
  IWorkspaceFileAnalysisOptions,
  IWorkspaceFileAnalysisResult,
  IWorkspaceFileAnalysisState,
  WorkspaceFileStat,
} from './types';

function createWorkspaceFileAnalysisState(): IWorkspaceFileAnalysisState {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    cacheMissFilePaths: new Set(),
    fileAnalysis: new Map<string, IFileAnalysisResult>(),
    fileConnections: new Map<string, IProjectedConnection[]>(),
  };
}

function prepareAnalysisForActiveCacheTiers(
  options: IWorkspaceFileAnalysisOptions,
  analysis: IFileAnalysisResult,
): IFileAnalysisResult {
  return projectAnalysisForCacheTiers(analysis, options.cacheTiers?.active);
}

function prepareAnalysisForCacheStorage(
  options: IWorkspaceFileAnalysisOptions,
  analysis: IFileAnalysisResult,
): IFileAnalysisResult {
  return markAnalysisCacheTiers(
    prepareAnalysisForActiveCacheTiers(options, analysis),
    options.cacheTiers?.completed,
  );
}

function getCurrentFileCount(state: IWorkspaceFileAnalysisState): number {
  return state.cacheHits + state.cacheMisses;
}

function emitWorkspaceFileProgress(
  options: IWorkspaceFileAnalysisOptions,
  state: IWorkspaceFileAnalysisState,
  file: IDiscoveredFile,
): void {
  options.onProgress?.({
    current: getCurrentFileCount(state),
    total: options.files.length,
    filePath: file.relativePath,
  });
}

function recordWorkspaceFileAnalysis(
  state: IWorkspaceFileAnalysisState,
  file: IDiscoveredFile,
  analysis: IFileAnalysisResult,
): IProjectedConnection[] {
  const connections = projectProjectedConnectionsFromFileAnalysis(analysis);
  state.fileAnalysis.set(file.relativePath, analysis);
  state.fileConnections.set(file.relativePath, connections);
  return connections;
}

function readCacheHitAnalysis(
  options: IWorkspaceFileAnalysisOptions,
  file: IDiscoveredFile,
  stat: WorkspaceFileStat,
): IFileAnalysisResult | undefined {
  const cached = options.cache.files[file.relativePath];
  if (!cached || cached.mtime !== stat?.mtime) {
    return undefined;
  }

  if (!hasRequiredAnalysisCacheTiers(cached.analysis, options.cacheTiers?.required)) {
    return undefined;
  }

  if (cached.size === undefined && stat?.size !== undefined) {
    cached.size = stat.size;
  }

  return prepareAnalysisForActiveCacheTiers(options, cached.analysis);
}

function recordCacheHit(
  options: IWorkspaceFileAnalysisOptions,
  state: IWorkspaceFileAnalysisState,
  file: IDiscoveredFile,
  analysis: IFileAnalysisResult,
): void {
  recordWorkspaceFileAnalysis(state, file, analysis);
  state.cacheHits += 1;
  emitWorkspaceFileProgress(options, state, file);
}

async function analyzeCacheMiss(
  options: IWorkspaceFileAnalysisOptions,
  state: IWorkspaceFileAnalysisState,
  file: IDiscoveredFile,
  stat: WorkspaceFileStat,
): Promise<void> {
  state.cacheMisses += 1;
  state.cacheMissFilePaths.add(file.relativePath);
  throwIfWorkspaceAnalysisAborted(options.signal);
  const content = await options.readContent(file);
  throwIfWorkspaceAnalysisAborted(options.signal);
  const analysis = prepareAnalysisForCacheStorage(
    options,
    await options.analyzeFile(file.absolutePath, content, options.workspaceRoot),
  );
  const connections = recordWorkspaceFileAnalysis(state, file, analysis);

  options.emitFileProcessed?.({
    filePath: file.relativePath,
    connections: connections.map((connection) => ({
      specifier: connection.specifier,
      resolvedPath: connection.resolvedPath,
    })),
  });
  emitWorkspaceFileProgress(options, state, file);

  options.cache.files[file.relativePath] = {
    mtime: stat?.mtime ?? 0,
    analysis,
    size: stat?.size,
  };
}

async function analyzeWorkspaceFile(
  options: IWorkspaceFileAnalysisOptions,
  state: IWorkspaceFileAnalysisState,
  file: IDiscoveredFile,
): Promise<void> {
  throwIfWorkspaceAnalysisAborted(options.signal);

  const stat = await options.getFileStat(file.absolutePath);
  const cachedAnalysis = readCacheHitAnalysis(options, file, stat);
  if (cachedAnalysis) {
    recordCacheHit(options, state, file, cachedAnalysis);
    return;
  }

  await analyzeCacheMiss(options, state, file, stat);
}

function updateCachedEnrichedAnalysis(
  options: IWorkspaceFileAnalysisOptions,
  state: IWorkspaceFileAnalysisState,
  enrichedFileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): void {
  const symbolTierIsInactive = options.cacheTiers?.active !== undefined
    && !options.cacheTiers.active.includes(SYMBOLS_ANALYSIS_CACHE_TIER);

  for (const [relativePath, analysis] of enrichedFileAnalysis.entries()) {
    if (!state.cacheMissFilePaths.has(relativePath) && symbolTierIsInactive) {
      continue;
    }
    options.cache.files[relativePath].analysis = analysis;
  }
}

export async function analyzeWorkspaceFiles(
  options: IWorkspaceFileAnalysisOptions
): Promise<IWorkspaceFileAnalysisResult> {
  throwIfWorkspaceAnalysisAborted(options.signal);

  const state = createWorkspaceFileAnalysisState();

  for (const file of options.files) {
    await analyzeWorkspaceFile(options, state, file);
  }

  const enrichedFileAnalysis = enrichWorkspaceFileAnalysis(state.fileAnalysis);
  updateCachedEnrichedAnalysis(options, state, enrichedFileAnalysis);

  return {
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
    fileAnalysis: enrichedFileAnalysis,
    fileConnections: projectConnectionMapFromFileAnalysis(enrichedFileAnalysis),
  };
}

/**
 * @fileoverview Per-file analysis helpers for workspace analysis.
 * @module extension/workspaceFileAnalysis
 */

import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../core/plugins/types/contracts';
import { throwIfWorkspaceAnalysisAborted } from './abort';
import type { IWorkspaceAnalysisCache } from './cache';
import {
  projectConnectionMapFromFileAnalysis,
  projectProjectedConnectionsFromFileAnalysis,
} from './projection';

interface IWorkspaceFileProcessedConnection {
  resolvedPath: string | null;
  specifier: string;
}

export interface IWorkspaceFileProcessedPayload {
  connections: IWorkspaceFileProcessedConnection[];
  filePath: string;
}

export interface IWorkspaceFileAnalysisOptions {
  analyzeFile: (
    absolutePath: string,
    content: string,
    workspaceRoot: string
  ) => Promise<IFileAnalysisResult>;
  cache: IWorkspaceAnalysisCache;
  emitFileProcessed?: (payload: IWorkspaceFileProcessedPayload) => void;
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void;
  files: IDiscoveredFile[];
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
  readContent: (file: IDiscoveredFile) => Promise<string>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface IWorkspaceFileAnalysisResult {
  cacheHits: number;
  cacheMisses: number;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
}

function enrichWorkspaceFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Map<string, IFileAnalysisResult> {
  const symbolsByFilePath = new Map<string, IAnalysisSymbol[]>();

  for (const analysis of fileAnalysis.values()) {
    if (!analysis.symbols?.length) {
      continue;
    }

    symbolsByFilePath.set(analysis.filePath, analysis.symbols);
  }

  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      {
        ...analysis,
        relations: (analysis.relations ?? []).map((relation) =>
          enrichRelationTargetSymbol(relation, symbolsByFilePath),
        ),
      },
    ]),
  );
}

function enrichRelationTargetSymbol(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
): IAnalysisRelation {
  if (relation.toSymbolId || !relation.toFilePath) {
    return relation;
  }

  const targetSymbols = symbolsByFilePath.get(relation.toFilePath);
  if (!targetSymbols?.length) {
    return relation;
  }

  const resolvedSymbolId = resolveTargetSymbolId(relation, targetSymbols);
  return resolvedSymbolId
    ? {
      ...relation,
      toSymbolId: resolvedSymbolId,
    }
    : relation;
}

function resolveTargetSymbolId(
  relation: IAnalysisRelation,
  targetSymbols: readonly IAnalysisSymbol[],
): string | undefined {
  const memberName = readRelationMetadataString(relation, 'memberName');
  const importedName = readRelationMetadataString(relation, 'importedName');
  const symbolName = memberName ?? (
    importedName && importedName !== '*' && importedName !== 'default'
      ? importedName
      : undefined
  );

  if (symbolName) {
    const matches = targetSymbols.filter((symbol) => symbol.name === symbolName);
    if (matches.length === 1) {
      return matches[0].id;
    }
  }

  return targetSymbols.length === 1 ? targetSymbols[0].id : undefined;
}

function readRelationMetadataString(
  relation: IAnalysisRelation,
  key: string,
): string | undefined {
  const value = relation.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function analyzeWorkspaceFiles(
  options: IWorkspaceFileAnalysisOptions
): Promise<IWorkspaceFileAnalysisResult> {
  const {
    analyzeFile,
    cache,
    emitFileProcessed,
    files,
    getFileStat,
    readContent,
    signal,
    workspaceRoot,
  } = options;

  throwIfWorkspaceAnalysisAborted(signal);

  const fileAnalysis = new Map<string, IFileAnalysisResult>();
  const fileConnections = new Map<string, IProjectedConnection[]>();
  let cacheHits = 0;
  let cacheMisses = 0;

  for (const file of files) {
    throwIfWorkspaceAnalysisAborted(signal);

    const cached = cache.files[file.relativePath];
    const stat = await getFileStat(file.absolutePath);

    if (cached && cached.mtime === stat?.mtime) {
      if (cached.size === undefined && stat?.size !== undefined) {
        cached.size = stat.size;
      }

      fileAnalysis.set(file.relativePath, cached.analysis);
      fileConnections.set(
        file.relativePath,
        projectProjectedConnectionsFromFileAnalysis(cached.analysis),
      );
      cacheHits += 1;
      options.onProgress?.({
        current: cacheHits + cacheMisses,
        total: files.length,
        filePath: file.relativePath,
      });
      continue;
    }

    cacheMisses += 1;
    throwIfWorkspaceAnalysisAborted(signal);
    const content = await readContent(file);
    throwIfWorkspaceAnalysisAborted(signal);
    const analysis = await analyzeFile(file.absolutePath, content, workspaceRoot);
    const connections = projectProjectedConnectionsFromFileAnalysis(analysis);

    fileAnalysis.set(file.relativePath, analysis);
    fileConnections.set(file.relativePath, connections);
    emitFileProcessed?.({
      filePath: file.relativePath,
      connections: connections.map((connection) => ({
        specifier: connection.specifier,
        resolvedPath: connection.resolvedPath,
      })),
    });
    options.onProgress?.({
      current: cacheHits + cacheMisses,
      total: files.length,
      filePath: file.relativePath,
    });

    cache.files[file.relativePath] = {
      mtime: stat?.mtime ?? 0,
      analysis,
      size: stat?.size,
    };
  }

  const enrichedFileAnalysis = enrichWorkspaceFileAnalysis(fileAnalysis);

  for (const [relativePath, analysis] of enrichedFileAnalysis.entries()) {
    const cached = cache.files[relativePath];
    if (cached) {
      cached.analysis = analysis;
    }
  }

  return {
    cacheHits,
    cacheMisses,
    fileAnalysis: enrichedFileAnalysis,
    fileConnections: projectConnectionMapFromFileAnalysis(enrichedFileAnalysis),
  };
}

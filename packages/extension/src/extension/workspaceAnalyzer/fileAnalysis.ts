/**
 * @fileoverview Per-file analysis helpers for workspace analysis.
 * @module extension/workspaceFileAnalysis
 */

import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { IConnection } from '../../core/plugins/types/contracts';
import { throwIfWorkspaceAnalysisAborted } from './abort';
import type { IWorkspaceAnalysisCache } from './cache';

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
  ) => Promise<IConnection[]>;
  cache: IWorkspaceAnalysisCache;
  emitFileProcessed?: (payload: IWorkspaceFileProcessedPayload) => void;
  files: IDiscoveredFile[];
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
  readContent: (file: IDiscoveredFile) => Promise<string>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface IWorkspaceFileAnalysisResult {
  cacheHits: number;
  cacheMisses: number;
  fileConnections: Map<string, IConnection[]>;
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

  const fileConnections = new Map<string, IConnection[]>();
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

      fileConnections.set(file.relativePath, cached.connections);
      cacheHits += 1;
      continue;
    }

    cacheMisses += 1;
    throwIfWorkspaceAnalysisAborted(signal);
    const content = await readContent(file);
    throwIfWorkspaceAnalysisAborted(signal);
    const connections = await analyzeFile(file.absolutePath, content, workspaceRoot);

    fileConnections.set(file.relativePath, connections);
    emitFileProcessed?.({
      filePath: file.relativePath,
      connections: connections.map((connection) => ({
        specifier: connection.specifier,
        resolvedPath: connection.resolvedPath,
      })),
    });

    cache.files[file.relativePath] = {
      mtime: stat?.mtime ?? 0,
      connections,
      size: stat?.size,
    };
  }

  return {
    cacheHits,
    cacheMisses,
    fileConnections,
  };
}

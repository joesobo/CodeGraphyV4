import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../discovery/contracts';
import type { IProjectedConnection } from '../projectedConnection';
import type { AnalysisCacheTierOptions } from './cacheTiers';

interface IWorkspaceFileProcessedConnection {
  resolvedPath: string | null;
  specifier: string;
}

export interface IWorkspaceFileProcessedPayload {
  connections: IWorkspaceFileProcessedConnection[];
  filePath: string;
}

export interface WorkspaceFileAnalysisRequest {
  features: {
    symbols: boolean;
  };
}

export interface IWorkspaceFileAnalysisOptions {
  analyzeFile: (
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    request: WorkspaceFileAnalysisRequest,
  ) => Promise<IFileAnalysisResult>;
  cache: {
    files: Record<string, {
      analysis: IFileAnalysisResult;
      mtime: number;
      size?: number;
    }>;
  };
  cacheTiers?: AnalysisCacheTierOptions;
  emitFileProcessed?: (payload: IWorkspaceFileProcessedPayload) => void;
  forceAnalyze?: boolean;
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void;
  files: IDiscoveredFile[];
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
  preAnalyzeFiles?: (
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
  ) => Promise<void>;
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

export type WorkspaceFileStat = Awaited<ReturnType<IWorkspaceFileAnalysisOptions['getFileStat']>>;

export interface IWorkspaceFileAnalysisState {
  cacheHits: number;
  cacheMisses: number;
  cacheMissFilePaths: Set<string>;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
  preAnalysisCompleted: boolean;
}

import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type {
  IFileAnalysisResult,
  IProjectedConnection,
} from '../../../core/plugins/types/contracts';

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
  cache: {
    files: Record<string, {
      analysis: IFileAnalysisResult;
      mtime: number;
      size?: number;
    }>;
  };
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

export type WorkspaceFileStat = Awaited<ReturnType<IWorkspaceFileAnalysisOptions['getFileStat']>>;

export interface IWorkspaceFileAnalysisState {
  cacheHits: number;
  cacheMisses: number;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
}

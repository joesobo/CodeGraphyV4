import type { DiagnosticEventSink } from '../diagnostics/events';
import type { GraphQueryRequest } from '../graphQuery';

export type { GraphQueryReport } from '../graphQuery';

export interface WorkspacePathInput {
  diagnostics?: DiagnosticEventSink;
  workspacePath?: string;
}

export interface WorkspaceStatusResult {
  [key: string]: unknown;
  workspaceRoot: string;
  graphCache: string;
  state: 'fresh' | 'stale' | 'missing';
  hasGraphCache: boolean;
  staleReasons: string[];
  enabledPlugins: string[];
  message: string;
}

export interface IndexWorkspaceResult {
  [key: string]: unknown;
  workspaceRoot: string;
  graphCache: string;
  message: string;
  discovery: {
    indexedFiles: number;
    totalFound: number;
    limitReached: boolean;
    action?: string;
  };
  indexing: {
    mode: 'full' | 'incremental';
    analyzedFiles: number;
    deletedFiles: number;
    reusedFiles: number;
  };
}

export type WorkspaceGraphQueryInput = GraphQueryRequest & WorkspacePathInput & {
  projection?: WorkspaceGraphQueryProjection;
};

export interface WorkspaceGraphQueryProjection {
  filterPatterns?: string[];
  nodeTypes?: string[];
  edgeTypes?: string[];
}

export type WorkspaceGraphQueryResult = Record<string, unknown>;

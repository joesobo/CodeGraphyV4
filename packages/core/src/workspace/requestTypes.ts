import type { DiagnosticEventSink } from '../diagnostics/events';

export type GraphQueryReport =
  | 'nodes'
  | 'edges'
  | 'relationships'
  | 'symbols'
  | 'paths';

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
}

export interface WorkspaceGraphQueryInput extends WorkspacePathInput {
  report: GraphQueryReport;
  arguments: Record<string, unknown>;
}

export type WorkspaceGraphQueryResult = Record<string, unknown>;

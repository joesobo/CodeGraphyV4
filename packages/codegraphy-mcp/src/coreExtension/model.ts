export type GraphQueryReport =
  | 'nodes'
  | 'edges'
  | 'relationships'
  | 'symbols'
  | 'paths';

export interface OpenRepoInput {
  repoPath: string;
}

export interface OpenRepoResult {
  [key: string]: unknown;
  repo: string;
  graphCacheExists: boolean;
  message?: string;
}

export interface IndexRepoInput {
  repo: string;
}

export interface IndexRepoResult {
  [key: string]: unknown;
  repo: string;
  graphCache: string;
  message: string;
}

export interface GraphQueryInput {
  repo: string;
  report: GraphQueryReport;
  arguments: Record<string, unknown>;
}

export type GraphQueryResult = Record<string, unknown>;

export interface ToolErrorResult {
  [key: string]: unknown;
  error: string;
  message: string;
}

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

export interface ToolErrorResult {
  [key: string]: unknown;
  error: string;
  message: string;
}

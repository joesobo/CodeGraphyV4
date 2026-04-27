export type RepoDatabaseStatus = 'indexed' | 'missing' | 'stale';
export type RepoFreshness = 'fresh' | 'missing' | 'stale';
export type RepoStaleReason =
  | 'never-indexed'
  | 'missing-indexed-commit'
  | 'commit-changed'
  | 'current-commit-unavailable'
  | 'pending-changed-files';

export interface RepoStatusResult {
  [key: string]: unknown;
  workspaceRoot: string;
  databasePath: string;
  registered: boolean;
  status: RepoDatabaseStatus;
  freshness: RepoFreshness;
  detail: string;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  currentCommit: string | null;
  pendingChangedFiles: string[];
  staleReasons: RepoStaleReason[];
  warning?: string;
}

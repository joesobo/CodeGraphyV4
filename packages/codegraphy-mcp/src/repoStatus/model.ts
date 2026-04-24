export type RepoDatabaseStatus = 'indexed' | 'missing' | 'stale';

export interface RepoStatusResult {
  [key: string]: unknown;
  workspaceRoot: string;
  databasePath: string;
  registered: boolean;
  status: RepoDatabaseStatus;
  warning?: string;
}

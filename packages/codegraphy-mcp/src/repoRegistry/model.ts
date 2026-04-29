export interface RepoRegistryEntry {
  workspaceRoot: string;
  databasePath: string;
  lastSeenAt: string;
}

export interface RepoRegistryFile {
  repos: RepoRegistryEntry[];
}

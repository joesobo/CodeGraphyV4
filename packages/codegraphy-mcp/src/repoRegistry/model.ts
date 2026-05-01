export interface RepoRegistryEntry {
  workspaceRoot: string;
  databasePath: string;
  lastSeenAt: string;
}

export interface RepoRegistryFile {
  activeRepo?: string;
  repos: RepoRegistryEntry[];
}

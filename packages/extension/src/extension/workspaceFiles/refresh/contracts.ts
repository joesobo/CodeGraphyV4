export interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
  followUpDelayMs?: number;
  fullRefresh: boolean;
  gitignoreRefresh: boolean;
  logMessage: string;
  timeout: ReturnType<typeof setTimeout>;
}

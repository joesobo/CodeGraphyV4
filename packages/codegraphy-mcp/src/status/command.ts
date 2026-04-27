import * as path from 'node:path';
import { readRepoStatus } from '../repoStatus/read';

export interface StatusCommandResult {
  exitCode: number;
  output: string;
}

interface StatusCommandDependencies {
  readCurrentCommitSha(workspaceRoot: string): string | null;
}

export function runStatusCommand(
  repoPath = process.cwd(),
  dependencies?: StatusCommandDependencies,
): StatusCommandResult {
  const status = readRepoStatus(path.resolve(repoPath), dependencies);
  const lines = [
    `repo: ${status.workspaceRoot}`,
    `database: ${status.databasePath}`,
    `status: ${status.status}`,
    `freshness: ${status.freshness}`,
    `registered: ${status.registered}`,
    `lastIndexedAt: ${status.lastIndexedAt ?? 'null'}`,
    `lastIndexedCommit: ${status.lastIndexedCommit ?? 'null'}`,
    `currentCommit: ${status.currentCommit ?? 'null'}`,
    `pendingChangedFiles: ${status.pendingChangedFiles.length}`,
    `detail: ${status.detail}`,
  ];

  if (status.staleReasons.length > 0) {
    lines.push(`staleReasons: ${status.staleReasons.join(', ')}`);
  }

  if (status.warning) {
    lines.push(`warning: ${status.warning}`);
  }

  return {
    exitCode: status.status === 'indexed' ? 0 : 1,
    output: lines.join('\n'),
  };
}

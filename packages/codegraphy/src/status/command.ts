import * as path from 'node:path';
import { readRepoStatus } from '../repoStatus/read';

export interface StatusCommandResult {
  exitCode: number;
  output: string;
}

export function runStatusCommand(repoPath = process.cwd()): StatusCommandResult {
  const status = readRepoStatus(path.resolve(repoPath));
  const lines = [
    `repo: ${status.workspaceRoot}`,
    `database: ${status.databasePath}`,
    `status: ${status.status}`,
    `registered: ${status.registered}`,
  ];

  if (status.warning) {
    lines.push(`warning: ${status.warning}`);
  }

  return {
    exitCode: status.status === 'indexed' ? 0 : 1,
    output: lines.join('\n'),
  };
}

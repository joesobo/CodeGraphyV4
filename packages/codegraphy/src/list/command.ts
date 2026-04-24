import { listRegisteredRepoStatuses } from '../repoStatus/read';

export interface ListCommandResult {
  exitCode: number;
  output: string;
}

export function runListCommand(): ListCommandResult {
  const repos = listRegisteredRepoStatuses();
  if (repos.length === 0) {
    return {
      exitCode: 0,
      output: 'No indexed CodeGraphy repos are registered yet.',
    };
  }

  const lines = repos.map((repo) => `${repo.status}\t${repo.workspaceRoot}\t${repo.databasePath}`);
  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

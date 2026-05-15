import { readRepoRegistry } from '../repoRegistry/file';

export interface ListCommandResult {
  exitCode: number;
  output: string;
}

export function runListCommand(): ListCommandResult {
  const registry = readRepoRegistry();
  if (registry.repos.length === 0) {
    return {
      exitCode: 0,
      output: 'No CodeGraphy repos are registered yet.',
    };
  }

  const lines = registry.repos.map((repo) => {
    const activeMarker = repo.workspaceRoot === registry.activeRepo ? '*' : '-';
    return `${activeMarker}\t${repo.workspaceRoot}`;
  });
  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

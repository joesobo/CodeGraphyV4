import { getWorkspaceDatabasePath } from '../database/paths';
import { setActiveRepo, upsertRepoRegistryEntry } from '../repoRegistry/file';
import type { CommandExecutionResult } from '../run/command';
import { requestCodeGraphyOpenRepo } from '../coreExtension/open';

function renderCommandResult(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

export function runOpenCommand(repoPath: string | undefined): CommandExecutionResult {
  if (!repoPath) {
    return {
      exitCode: 1,
      output: 'Usage: codegraphy open <repo>',
    };
  }

  const result = requestCodeGraphyOpenRepo({ repoPath });
  if ('error' in result) {
    return {
      exitCode: 1,
      output: renderCommandResult(result),
    };
  }

  setActiveRepo(result.repo);
  upsertRepoRegistryEntry({
    workspaceRoot: result.repo,
    databasePath: getWorkspaceDatabasePath(result.repo),
    lastSeenAt: new Date().toISOString(),
  });

  return {
    exitCode: 0,
    output: renderCommandResult(result),
  };
}

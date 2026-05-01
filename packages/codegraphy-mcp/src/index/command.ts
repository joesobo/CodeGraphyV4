import { readRepoRegistry } from '../repoRegistry/file';
import type { CommandExecutionResult } from '../run/command';
import { requestCodeGraphyIndexRepo } from '../coreExtension/indexing';

function renderCommandResult(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

export async function runIndexCommand(): Promise<CommandExecutionResult> {
  const activeRepo = readRepoRegistry().activeRepo;
  if (!activeRepo) {
    return {
      exitCode: 1,
      output: 'Open a repo first with `codegraphy open /absolute/path/to/repo`.',
    };
  }

  const result = await requestCodeGraphyIndexRepo({ repo: activeRepo });

  return {
    exitCode: 'error' in result ? 1 : 0,
    output: renderCommandResult(result),
  };
}

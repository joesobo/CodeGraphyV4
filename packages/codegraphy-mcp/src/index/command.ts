import { readRepoRegistry } from '../repoRegistry/file';
import type { CommandExecutionResult } from '../run/command';
import { requestCodeGraphyIndexRepo } from '../coreExtension/indexing';
import type { IndexRepoInput, IndexRepoResult, ToolErrorResult } from '../coreExtension/model';

interface IndexCommandDependencies {
  readRepoRegistry(): ReturnType<typeof readRepoRegistry>;
  requestIndexRepo(input: IndexRepoInput): Promise<IndexRepoResult | ToolErrorResult>;
  writeStatus(message: string): void;
}

const DEFAULT_DEPENDENCIES: IndexCommandDependencies = {
  readRepoRegistry,
  requestIndexRepo: requestCodeGraphyIndexRepo,
  writeStatus: (message) => {
    process.stderr.write(`${message}\n`);
  },
};

function renderCommandResult(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

export async function runIndexCommand(
  dependencies: IndexCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<CommandExecutionResult> {
  const activeRepo = dependencies.readRepoRegistry().activeRepo;
  if (!activeRepo) {
    return {
      exitCode: 1,
      output: 'Open a repo first with `codegraphy open /absolute/path/to/repo`.',
    };
  }

  dependencies.writeStatus(
    `CodeGraphy indexing started for ${activeRepo}. Waiting for the Core Extension response...`,
  );
  const result = await dependencies.requestIndexRepo({ repo: activeRepo });

  return {
    exitCode: 'error' in result ? 1 : 0,
    output: renderCommandResult(result),
  };
}

import type { IndexWorkspaceResult, WorkspacePathInput } from '../workspace/model';
import { requestCodeGraphyIndexWorkspace } from '../workspace/indexing';
import { resolveCodeGraphyWorkspacePath } from '../workspace/paths';
import type { CommandExecutionResult } from '../run/command';

interface IndexCommandDependencies {
  cwd(): string;
  indexWorkspace(input: WorkspacePathInput): Promise<IndexWorkspaceResult>;
  writeStatus(message: string): void;
}

const DEFAULT_DEPENDENCIES: IndexCommandDependencies = {
  cwd: () => process.cwd(),
  indexWorkspace: requestCodeGraphyIndexWorkspace,
  writeStatus: (message) => {
    process.stderr.write(`${message}\n`);
  },
};

function renderCommandResult(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

export async function runIndexCommand(
  workspacePath?: string,
  dependencies: IndexCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<CommandExecutionResult> {
  const resolvedWorkspaceRoot = resolveCodeGraphyWorkspacePath(workspacePath, dependencies.cwd());
  dependencies.writeStatus(`CodeGraphy indexing started for ${resolvedWorkspaceRoot}...`);
  const result = await dependencies.indexWorkspace({ workspacePath: resolvedWorkspaceRoot });

  return {
    exitCode: 0,
    output: renderCommandResult(result),
  };
}

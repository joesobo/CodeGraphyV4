import type { CommandExecutionResult } from '../command';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import { readCodeGraphyWorkspaceStatusForCli } from '../../workspace/requestStatus';
import type { WorkspacePathInput, WorkspaceStatusResult } from '../../workspace/requestTypes';

interface StatusCommandDependencies {
  cwd(): string;
  readStatus(input: WorkspacePathInput): WorkspaceStatusResult;
}

const DEFAULT_DEPENDENCIES: StatusCommandDependencies = {
  cwd: () => process.cwd(),
  readStatus: readCodeGraphyWorkspaceStatusForCli,
};

export function runStatusCommand(
  workspacePath?: string,
  dependencies: StatusCommandDependencies = DEFAULT_DEPENDENCIES,
): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(workspacePath, dependencies.cwd());
  return {
    exitCode: 0,
    output: JSON.stringify(dependencies.readStatus({ workspacePath: workspaceRoot }), null, 2),
  };
}

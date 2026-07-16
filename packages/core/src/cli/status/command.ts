import type { CommandExecutionResult } from '../command';
import type { DiagnosticEvent, DiagnosticEventSink } from '../../diagnostics/events';
import { formatDiagnosticEventLine } from '../../diagnostics/events';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import { readCodeGraphyWorkspaceStatusForCli } from '../../workspace/requestStatus';
import type { WorkspacePathInput, WorkspaceStatusResult } from '../../workspace/requestTypes';

interface StatusCommandDependencies {
  cwd(): string;
  readStatus(input: WorkspacePathInput): WorkspaceStatusResult;
  writeDiagnostic?(line: string): void;
}

interface StatusCommandOptions {
  verbose?: boolean;
  writeDiagnostic?(line: string): void;
}

const DEFAULT_DEPENDENCIES: StatusCommandDependencies = {
  cwd: () => process.cwd(),
  readStatus: readCodeGraphyWorkspaceStatusForCli,
};

export function runStatusCommand(
  workspacePath?: string,
  dependencies: StatusCommandDependencies = DEFAULT_DEPENDENCIES,
  options: StatusCommandOptions = {},
): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(workspacePath, dependencies.cwd());
  const diagnostics: DiagnosticEventSink | undefined = options.verbose
    ? {
        emit(event: DiagnosticEvent): void {
          const writeDiagnostic = (line: string): void => {
            if (options.writeDiagnostic) {
              options.writeDiagnostic(line);
              return;
            }
            if (dependencies.writeDiagnostic) {
              dependencies.writeDiagnostic(line);
              return;
            }
            process.stderr.write(`${line}\n`);
          };
          writeDiagnostic(formatDiagnosticEventLine(event));
        },
      }
    : undefined;
  return {
    exitCode: 0,
    output: JSON.stringify(dependencies.readStatus({
      workspacePath: workspaceRoot,
      ...(diagnostics ? { diagnostics } : {}),
    })),
  };
}

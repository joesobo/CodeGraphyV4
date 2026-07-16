import { requestCodeGraphyIndexWorkspace } from '../../workspace/requestIndexing';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import type { IndexWorkspaceResult, WorkspacePathInput } from '../../workspace/requestTypes';
import type { DiagnosticEvent, DiagnosticEventSink } from '../../diagnostics/events';
import { formatDiagnosticEventLine } from '../../diagnostics/events';
import type { CommandExecutionResult } from '../command';

interface IndexCommandDependencies {
  cwd(): string;
  indexWorkspace(input: WorkspacePathInput): Promise<IndexWorkspaceResult>;
  writeDiagnostic?(line: string): void;
  writeStatus(message: string): void;
}

interface IndexCommandOptions {
  verbose?: boolean;
  writeDiagnostic?(line: string): void;
}

const DEFAULT_DEPENDENCIES: IndexCommandDependencies = {
  cwd: () => process.cwd(),
  indexWorkspace: requestCodeGraphyIndexWorkspace,
  writeStatus: (message) => {
    process.stderr.write(`${message}\n`);
  },
};

function renderCommandResult(result: Record<string, unknown>): string {
  return JSON.stringify(result);
}

export async function runIndexCommand(
  workspacePath?: string,
  dependencies: IndexCommandDependencies = DEFAULT_DEPENDENCIES,
  options: IndexCommandOptions = {},
): Promise<CommandExecutionResult> {
  const resolvedWorkspaceRoot = resolveCodeGraphyWorkspacePath(workspacePath, dependencies.cwd());
  dependencies.writeStatus(`CodeGraphy indexing started for ${resolvedWorkspaceRoot}...`);
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
  const result = await dependencies.indexWorkspace({
    workspacePath: resolvedWorkspaceRoot,
    ...(diagnostics ? { diagnostics } : {}),
  });

  return {
    exitCode: 0,
    output: renderCommandResult(result),
  };
}

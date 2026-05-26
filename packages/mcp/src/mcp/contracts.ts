import type {
  CliCommand,
  CommandExecutionResult,
  IndexWorkspaceResult,
  WorkspaceGraphQueryInput,
  WorkspaceGraphQueryResult,
  WorkspacePathInput,
  WorkspaceStatusResult,
} from '@codegraphy-dev/core';

export interface CodeGraphyMcpServerDependencies {
  cwd(): string;
  indexWorkspace(input: WorkspacePathInput): Promise<IndexWorkspaceResult>;
  runGraphQuery(input: WorkspaceGraphQueryInput): Promise<WorkspaceGraphQueryResult>;
  runPluginsCommand?(command: CliCommand): Promise<CommandExecutionResult>;
  statusWorkspace(input: WorkspacePathInput): Promise<WorkspaceStatusResult> | WorkspaceStatusResult;
}

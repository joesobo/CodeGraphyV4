import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { resolveWorkspaceRoot } from './workspace';

export function runDisableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('disable');
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.disableWorkspacePlugin(workspaceRoot, command.packageName);
  return {
    exitCode: 0,
    output: `Disabled ${command.packageName} for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
  };
}

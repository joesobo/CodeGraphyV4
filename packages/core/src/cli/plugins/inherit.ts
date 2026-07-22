import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { resolveWorkspaceRoot } from './workspace';

export function runInheritCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('inherit');
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.inheritWorkspacePlugin(workspaceRoot, command.packageName);
  return {
    exitCode: 0,
    output: `${command.packageName} now uses the global default for ${workspaceRoot}.`,
  };
}

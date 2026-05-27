import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { findRegisteredPlugin } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runEnableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('enable');
  }

  const plugin = findRegisteredPlugin(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  if (!plugin) {
    return {
      exitCode: 1,
      output: [
        `Plugin '${command.packageName}' is not in ~/.codegraphy/plugins.json.`,
        `Run \`codegraphy plugins register ${command.packageName}\`, then retry.`,
      ].join(' '),
    };
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.enableWorkspacePlugin(workspaceRoot, plugin);
  return {
    exitCode: 0,
    output: `Enabled ${plugin.package} for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
  };
}

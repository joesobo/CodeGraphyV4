import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { findRegisteredPlugin, getRegisteredPluginId } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runDisableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('disable');
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  const plugin = findRegisteredPlugin(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  const pluginId = plugin ? getRegisteredPluginId(plugin) : command.packageName;
  dependencies.disableWorkspacePlugin(workspaceRoot, pluginId);
  return {
    exitCode: 0,
    output: `Disabled ${pluginId} for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
  };
}

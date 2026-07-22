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

  const plugin = findRegisteredPlugin(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  const pluginId = plugin ? getRegisteredPluginId(plugin) : command.packageName;
  if (command.pluginScope === 'global') {
    if (!plugin) {
      return {
        exitCode: 1,
        output: `Plugin '${command.packageName}' is not in ~/.codegraphy/plugins.json.`,
      };
    }
    dependencies.setGlobalPluginActivation(pluginId, false, {
      ...(dependencies.homeDir ? { homeDir: dependencies.homeDir } : {}),
    });
    return {
      exitCode: 0,
      output: `Disabled ${pluginId} globally.`,
    };
  }
  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.disableWorkspacePlugin(workspaceRoot, pluginId);
  return {
    exitCode: 0,
    output: `Disabled ${pluginId} for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
  };
}

import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { findRegisteredPlugins } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runDisableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('disable');
  }

  const plugins = findRegisteredPlugins(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  const pluginIds = plugins.length > 0 ? plugins.map(plugin => plugin.id) : [command.packageName];
  const pluginLabel = pluginIds.join(', ');
  if (command.pluginScope === 'global') {
    if (plugins.length === 0) {
      return {
        exitCode: 1,
        output: `Plugin '${command.packageName}' is not in ~/.codegraphy/plugins.json.`,
      };
    }
    for (const pluginId of pluginIds) {
      dependencies.setGlobalPluginActivation(pluginId, false, {
        ...(dependencies.homeDir ? { homeDir: dependencies.homeDir } : {}),
      });
    }
    return {
      exitCode: 0,
      output: `Disabled ${pluginLabel} globally.`,
    };
  }
  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  for (const pluginId of pluginIds) {
    dependencies.disableWorkspacePlugin(workspaceRoot, pluginId);
  }
  return {
    exitCode: 0,
    output: `Disabled ${pluginLabel} for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
  };
}

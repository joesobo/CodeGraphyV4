import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { findRegisteredPlugins } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runInheritCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('inherit');
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  const plugins = findRegisteredPlugins(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  const pluginIds = plugins.length > 0 ? plugins.map(plugin => plugin.id) : [command.packageName];
  for (const pluginId of pluginIds) {
    dependencies.inheritWorkspacePlugin(workspaceRoot, pluginId);
  }
  return {
    exitCode: 0,
    output: `${pluginIds.join(', ')} now uses the global default for ${workspaceRoot}.`,
  };
}

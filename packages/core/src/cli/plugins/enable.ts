import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';
import { findRegisteredPlugins } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runEnableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('enable');
  }

  const plugins = findRegisteredPlugins(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  if (plugins.length === 0) {
    return {
      exitCode: 1,
      output: [
        `Plugin '${command.packageName}' is not in ~/.codegraphy/plugins.json.`,
        `Run \`codegraphy plugins register ${command.packageName}\`, then retry.`,
      ].join(' '),
    };
  }

  const pluginIds = [...new Set(plugins.map(plugin => plugin.id))];
  const pluginLabel = pluginIds.join(', ');
  if (command.pluginScope === 'global') {
    for (const plugin of plugins) {
      dependencies.setGlobalPluginActivation(plugin, true, {
        ...(dependencies.homeDir ? { homeDir: dependencies.homeDir } : {}),
      });
    }
    return {
      exitCode: 0,
      output: `Enabled ${pluginLabel} globally.`,
    };
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  for (const plugin of plugins) {
    dependencies.enableWorkspacePlugin(workspaceRoot, plugin);
  }
  return {
    exitCode: 0,
    output: `Enabled ${pluginLabel} for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
  };
}

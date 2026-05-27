import { readCodeGraphyWorkspaceSettingsOrInitial } from '../../workspace/settings';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { listRegisteredPluginsWithBundledMarkdown } from './installed';
import { resolveWorkspaceRoot } from './workspace';

export function runListCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  const registeredPlugins = listRegisteredPluginsWithBundledMarkdown(
    dependencies.readInstalledPluginCache({
      homeDir: dependencies.homeDir,
    }),
  );
  const enabledPlugins = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot).plugins;
  const enabledPackages = new Set(enabledPlugins.map(plugin => plugin.package));
  const disabledPlugins = registeredPlugins.filter(plugin => !enabledPackages.has(plugin.package));

  const lines = [
    `CodeGraphy plugins for ${workspaceRoot}`,
    '',
    'Enabled in workspace:',
    ...(
      enabledPlugins.length > 0
        ? enabledPlugins.map((plugin, index) => `${index + 1}. ${plugin.package}`)
        : ['none']
    ),
    '',
    'Registered but disabled:',
    ...(
      disabledPlugins.length > 0
        ? disabledPlugins.map(plugin => `- ${plugin.package}`)
        : ['none']
    ),
  ];

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

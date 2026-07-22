import { readCodeGraphyWorkspaceSettingsOrInitial } from '../../workspace/settings';
import { createPluginActivityState } from '../../plugins/activityState/model';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import {
  getRegisteredPluginId,
  listRegisteredPluginsWithBundledMarkdown,
} from './installed';
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
  const activity = createPluginActivityState({
    settings: readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot),
    installedPlugins: registeredPlugins,
  });
  const enabledPluginIds = [...activity.activePluginIds];
  const enabledPluginIdSet = new Set(enabledPluginIds);
  const disabledPlugins = registeredPlugins.filter(plugin =>
    !enabledPluginIdSet.has(getRegisteredPluginId(plugin))
  );

  const lines = [
    `CodeGraphy plugins for ${workspaceRoot}`,
    '',
    'Enabled in workspace:',
    ...(
      enabledPluginIds.length > 0
        ? enabledPluginIds.map((pluginId, index) => `${index + 1}. ${pluginId}`)
        : ['none']
    ),
    '',
    'Registered but disabled:',
    ...(
      disabledPlugins.length > 0
        ? disabledPlugins.map(plugin => `- ${getRegisteredPluginId(plugin)}`)
        : ['none']
    ),
  ];

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

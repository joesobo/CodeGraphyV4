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
  const activePluginIds = [...activity.activePluginIds];
  const enabledPluginIds = [...activity.enabledPluginIds];
  const enabledPluginIdSet = new Set(enabledPluginIds);
  const unavailablePluginIds = enabledPluginIds.filter(pluginId => !activity.activePluginIds.has(pluginId));
  const disabledPlugins = registeredPlugins.filter(plugin =>
    !enabledPluginIdSet.has(getRegisteredPluginId(plugin))
  );
  const disabledPluginIds = [...new Set(disabledPlugins.map(getRegisteredPluginId))];

  const lines = [
    `CodeGraphy plugins for ${workspaceRoot}`,
    '',
    'Enabled in workspace:',
    ...(
      activePluginIds.length > 0
        ? activePluginIds.map((pluginId, index) => `${index + 1}. ${pluginId}`)
        : ['none']
    ),
    '',
    'Enabled but unavailable:',
    ...(
      unavailablePluginIds.length > 0
        ? unavailablePluginIds.map(pluginId => `- ${pluginId}`)
        : ['none']
    ),
    '',
    'Registered but disabled:',
    ...(
      disabledPluginIds.length > 0
        ? disabledPluginIds.map(pluginId => `- ${pluginId}`)
        : ['none']
    ),
  ];

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

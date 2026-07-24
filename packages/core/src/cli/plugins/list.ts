import { readCodeGraphyWorkspaceSettingsOrInitial } from '../../workspace/settings';
import { createPluginActivityState } from '../../plugins/activityState/model';
import type { CodeGraphyInstalledPluginRecord } from '../../plugins/installedCache';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import {
  getRegisteredPluginId,
  listRegisteredPluginsWithBundledMarkdown,
} from './installed';
import { resolveWorkspaceRoot } from './workspace';

type PluginListState = 'active' | 'disabled' | 'enabled-unavailable';

function readPluginState(
  pluginId: string,
  activity: ReturnType<typeof createPluginActivityState>,
): PluginListState {
  if (activity.activePluginIds.has(pluginId)) return 'active';
  if (activity.enabledPluginIds.has(pluginId)) return 'enabled-unavailable';
  return 'disabled';
}

function createRegisteredPluginOutput(
  plugin: CodeGraphyInstalledPluginRecord,
  workspaceActivation: Map<string, 'inherit' | 'enabled' | 'disabled'>,
  activity: ReturnType<typeof createPluginActivityState>,
): Record<string, unknown> {
  return {
    id: plugin.id,
    package: plugin.package,
    host: plugin.host,
    globallyEnabled: plugin.globallyEnabled,
    workspaceActivation: workspaceActivation.get(plugin.id) ?? 'inherit',
    state: readPluginState(plugin.id, activity),
  };
}

export function runListCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const registeredPlugins = listRegisteredPluginsWithBundledMarkdown(
    dependencies.readInstalledPluginCache({
      homeDir: dependencies.homeDir,
    }),
  );
  const activity = createPluginActivityState({
    settings,
    installedPlugins: registeredPlugins,
  });
  const workspaceActivation = new Map(
    settings.plugins.map(plugin => [plugin.id, plugin.activation] as const),
  );
  const registeredPluginIds = new Set(registeredPlugins.map(getRegisteredPluginId));
  const unavailablePlugins = [...activity.enabledPluginIds]
    .filter(pluginId => !registeredPluginIds.has(pluginId))
    .map(pluginId => ({
      id: pluginId,
      workspaceActivation: workspaceActivation.get(pluginId) ?? 'inherit',
      state: readPluginState(pluginId, activity),
    }));

  return {
    exitCode: 0,
    output: JSON.stringify({
      workspaceRoot,
      plugins: [
        ...registeredPlugins.map(plugin => createRegisteredPluginOutput(
          plugin,
          workspaceActivation,
          activity,
        )),
        ...unavailablePlugins,
      ],
      warnings: activity.warnings,
    }),
  };
}

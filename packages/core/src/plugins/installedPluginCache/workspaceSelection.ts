import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export interface UpdateCodeGraphyWorkspacePluginSelectionOptions {
  pluginId: string;
  activation: CodeGraphyWorkspacePluginSettings['activation'];
}

export function updateCodeGraphyWorkspacePluginSelection(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: UpdateCodeGraphyWorkspacePluginSelectionOptions,
): CodeGraphyWorkspacePluginSettings[] {
  let existingIndex = -1;
  for (let index = 0; index < plugins.length; index += 1) {
    if (plugins[index].id === options.pluginId) existingIndex = index;
  }
  const nextPlugin: CodeGraphyWorkspacePluginSettings = {
    ...plugins[existingIndex],
    id: options.pluginId,
    activation: options.activation,
  };
  if (existingIndex < 0) {
    return [...plugins, nextPlugin];
  }

  return plugins.flatMap((plugin, index) => {
    if (plugin.id !== options.pluginId) return [plugin];
    return index === existingIndex ? [nextPlugin] : [];
  });
}

export function enableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  plugin: CodeGraphyInstalledPluginRecord,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      pluginId: plugin.id,
      activation: 'enabled',
    }),
  });
}

export function disableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  pluginId: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      pluginId,
      activation: 'disabled',
    }),
  });
}

export function inheritCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  pluginId: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      pluginId,
      activation: 'inherit',
    }),
  });
}

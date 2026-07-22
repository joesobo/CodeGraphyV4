import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export interface UpdateCodeGraphyWorkspacePluginSelectionOptions {
  pluginId: string;
  activation: CodeGraphyWorkspacePluginSettings['activation'];
  defaultOptions?: Record<string, unknown>;
}

export function updateCodeGraphyWorkspacePluginSelection(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: UpdateCodeGraphyWorkspacePluginSelectionOptions,
): CodeGraphyWorkspacePluginSettings[] {
  const existingIndex = plugins.findIndex(plugin => plugin.id === options.pluginId);
  const nextPlugin: CodeGraphyWorkspacePluginSettings = {
    ...plugins[existingIndex],
    id: options.pluginId,
    activation: options.activation,
  };
  const defaultOptions = options.defaultOptions ?? {};
  if (Object.keys(defaultOptions).length > 0) {
    nextPlugin.options = {
      ...defaultOptions,
      ...nextPlugin.options,
    };
  }

  if (existingIndex < 0) {
    return [...plugins, nextPlugin];
  }

  return plugins.map((plugin, index) => index === existingIndex ? nextPlugin : plugin);
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

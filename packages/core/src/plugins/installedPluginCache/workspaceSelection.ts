import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export interface UpdateCodeGraphyWorkspacePluginSelectionOptions {
  pluginId: string;
  enabled: boolean;
  defaultOptions?: Record<string, unknown>;
}

export type CodeGraphyWorkspacePluginToggleOptions = UpdateCodeGraphyWorkspacePluginSelectionOptions;

export type CodeGraphyWorkspacePluginIndexingPlan =
  | { kind: 'analyze-workspace' }
  | { kind: 'reprocess-plugin-files'; pluginIds: string[] };

export interface CodeGraphyWorkspacePluginTogglePlan {
  plugins: CodeGraphyWorkspacePluginSettings[];
  indexing: CodeGraphyWorkspacePluginIndexingPlan;
}

export function updateCodeGraphyWorkspacePluginSelection(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: UpdateCodeGraphyWorkspacePluginSelectionOptions,
): CodeGraphyWorkspacePluginSettings[] {
  const existingIndex = plugins.findIndex(plugin => plugin.id === options.pluginId);
  const nextPlugin: CodeGraphyWorkspacePluginSettings = {
    ...(existingIndex >= 0 ? plugins[existingIndex] : {}),
    id: options.pluginId,
    enabled: options.enabled,
  };
  if (options.defaultOptions && Object.keys(options.defaultOptions).length > 0) {
    nextPlugin.options = {
      ...options.defaultOptions,
      ...nextPlugin.options,
    };
  }

  if (existingIndex < 0) {
    return [...plugins, nextPlugin];
  }

  return plugins.map((plugin, index) => index === existingIndex ? nextPlugin : plugin);
}

export function createCodeGraphyWorkspacePluginTogglePlan(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: CodeGraphyWorkspacePluginToggleOptions,
): CodeGraphyWorkspacePluginTogglePlan {
  return {
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, options),
    indexing: { kind: 'analyze-workspace' },
  };
}

export function enableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  plugin: CodeGraphyInstalledPluginRecord,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const pluginId = plugin.pluginId ?? plugin.package;
  const existingIndex = settings.plugins.findIndex(entry => entry.id === pluginId);
  const entry = {
    id: pluginId,
    enabled: true,
    ...(plugin.defaultOptions ? { options: { ...plugin.defaultOptions } } : {}),
  };

  const plugins = [...settings.plugins];
  if (existingIndex >= 0) {
    const mergedOptions = {
      ...plugin.defaultOptions,
      ...plugins[existingIndex]?.options,
    };
    plugins[existingIndex] = {
      ...plugins[existingIndex],
      id: pluginId,
      enabled: true,
      ...(Object.keys(mergedOptions).length > 0 ? { options: mergedOptions } : {}),
    };
  } else {
    plugins.push(entry);
  }

  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, {
      pluginId,
      enabled: true,
      defaultOptions: plugin.defaultOptions,
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
      enabled: false,
    }),
  });
}

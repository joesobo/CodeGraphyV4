import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CodeGraphyWorkspacePluginSettings } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export interface UpdateCodeGraphyWorkspacePluginSelectionOptions {
  packageName: string;
  enabled: boolean;
  defaultOptions?: Record<string, unknown>;
}

export function updateCodeGraphyWorkspacePluginSelection(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
  options: UpdateCodeGraphyWorkspacePluginSelectionOptions,
): CodeGraphyWorkspacePluginSettings[] {
  if (!options.enabled) {
    return plugins.filter(plugin => plugin.package !== options.packageName);
  }

  if (plugins.some(plugin => plugin.package === options.packageName)) {
    return [...plugins];
  }

  const nextPlugin: CodeGraphyWorkspacePluginSettings = { package: options.packageName };
  if (options.defaultOptions && Object.keys(options.defaultOptions).length > 0) {
    nextPlugin.options = { ...options.defaultOptions };
  }

  return [...plugins, nextPlugin];
}

export function enableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  plugin: CodeGraphyInstalledPluginRecord,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const existingIndex = settings.plugins.findIndex(entry => entry.package === plugin.package);
  const entry = {
    package: plugin.package,
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
      package: plugin.package,
      ...(Object.keys(mergedOptions).length > 0 ? { options: mergedOptions } : {}),
    };
  } else {
    plugins.push(entry);
  }

  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(plugins, {
      packageName: plugin.package,
      enabled: true,
      defaultOptions: plugin.defaultOptions,
    }),
  });
}

export function disableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  packageName: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: updateCodeGraphyWorkspacePluginSelection(settings.plugins, {
      packageName,
      enabled: false,
    }),
  });
}

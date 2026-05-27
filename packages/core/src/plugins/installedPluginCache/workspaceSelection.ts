import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

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
    plugins,
  });
}

export function disableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  packageName: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: settings.plugins.filter(plugin => plugin.package !== packageName),
  });
}

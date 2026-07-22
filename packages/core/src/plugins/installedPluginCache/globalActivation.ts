import type { CodeGraphyInstalledPluginRecord, CodeGraphyUserStateOptions } from './contracts';
import {
  readCodeGraphyInstalledPluginCache,
  writeCodeGraphyInstalledPluginCache,
} from './storage';

export function setCodeGraphyInstalledPluginGlobalActivation(
  pluginId: string,
  globallyEnabled: boolean,
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginRecord {
  const cache = readCodeGraphyInstalledPluginCache(options);
  const index = cache.plugins.findIndex(plugin => plugin.id === pluginId);
  if (index < 0) {
    throw new Error(`CodeGraphy plugin '${pluginId}' is not installed.`);
  }

  const plugin: CodeGraphyInstalledPluginRecord = {
    ...cache.plugins[index],
    globallyEnabled,
  };
  const plugins = [...cache.plugins];
  plugins[index] = plugin;
  writeCodeGraphyInstalledPluginCache({ version: 3, plugins }, options);
  return plugin;
}

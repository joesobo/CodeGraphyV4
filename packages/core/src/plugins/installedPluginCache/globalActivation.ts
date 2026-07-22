import type { CodeGraphyInstalledPluginRecord, CodeGraphyUserStateOptions } from './contracts';
import {
  readCodeGraphyInstalledPluginCache,
  writeCodeGraphyInstalledPluginCache,
} from './storage';

function getInstalledPluginId(plugin: CodeGraphyInstalledPluginRecord): string {
  return plugin.pluginId ?? plugin.package;
}

export function setCodeGraphyInstalledPluginGlobalActivation(
  pluginId: string,
  globallyEnabled: boolean,
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginRecord {
  const cache = readCodeGraphyInstalledPluginCache(options);
  const index = cache.plugins.findIndex(plugin => getInstalledPluginId(plugin) === pluginId);
  if (index < 0) {
    throw new Error(`CodeGraphy plugin '${pluginId}' is not installed.`);
  }

  const plugin: CodeGraphyInstalledPluginRecord = {
    ...cache.plugins[index],
    globallyEnabled,
  };
  const plugins = [...cache.plugins];
  plugins[index] = plugin;
  writeCodeGraphyInstalledPluginCache({ version: 2, plugins }, options);
  return plugin;
}

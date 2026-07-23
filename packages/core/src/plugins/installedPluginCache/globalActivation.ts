import type { CodeGraphyInstalledPluginRecord, CodeGraphyUserStateOptions } from './contracts';
import {
  readCodeGraphyInstalledPluginCache,
  writeCodeGraphyInstalledPluginCache,
} from './storage';

export function setCodeGraphyInstalledPluginGlobalActivation(
  installedPlugin: CodeGraphyInstalledPluginRecord,
  globallyEnabled: boolean,
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginRecord {
  const cache = readCodeGraphyInstalledPluginCache(options);
  const index = cache.plugins.findIndex(plugin => (
    plugin.id === installedPlugin.id && plugin.package === installedPlugin.package
  ));
  const plugin: CodeGraphyInstalledPluginRecord = {
    ...(index >= 0 ? cache.plugins[index] : installedPlugin),
    globallyEnabled,
  };
  const plugins = [...cache.plugins];
  if (index >= 0) {
    plugins[index] = plugin;
  } else {
    plugins.push(plugin);
  }
  writeCodeGraphyInstalledPluginCache({ version: 3, plugins }, options);
  return plugin;
}

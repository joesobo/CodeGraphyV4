import type { IPluginInfoV2 } from '../state/store';

export function buildReorderedPluginMap(
  plugins: Map<string, IPluginInfoV2>,
  pluginIds: string[],
): Map<string, IPluginInfoV2> {
  const reorderedPlugins = new Map<string, IPluginInfoV2>();

  for (const pluginId of pluginIds) {
    const info = plugins.get(pluginId);
    if (!info) {
      continue;
    }

    reorderedPlugins.set(pluginId, info);
  }

  for (const [pluginId, info] of plugins) {
    reorderedPlugins.set(pluginId, info);
  }

  return reorderedPlugins;
}

export function replacePluginMap(
  plugins: Map<string, IPluginInfoV2>,
  reorderedPlugins: Map<string, IPluginInfoV2>,
): void {
  plugins.clear();
  for (const [pluginId, info] of reorderedPlugins) {
    plugins.set(pluginId, info);
  }
}

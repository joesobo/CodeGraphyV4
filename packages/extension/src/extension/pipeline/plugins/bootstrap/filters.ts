import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';

export interface WorkspacePipelinePluginFilterSource {
  list(): Array<{ plugin: { id?: string; name?: string; defaultFilters?: string[] } }>;
}

export function getWorkspacePipelinePluginFilterPatterns(
  source: WorkspacePipelinePluginFilterSource,
  disabledPlugins: ReadonlySet<string> = new Set(),
): string[] {
  const patterns: string[] = [];

  for (const pluginInfo of source.list()) {
    if (pluginInfo.plugin.id && disabledPlugins.has(pluginInfo.plugin.id)) {
      continue;
    }

    if (pluginInfo.plugin.defaultFilters) {
      patterns.push(...pluginInfo.plugin.defaultFilters);
    }
  }

  return [...new Set(patterns)];
}

export function getWorkspacePipelinePluginFilterGroups(
  source: WorkspacePipelinePluginFilterSource,
  disabledPlugins: ReadonlySet<string> = new Set(),
): IPluginFilterPatternGroup[] {
  return source.list()
    .filter(pluginInfo => !pluginInfo.plugin.id || !disabledPlugins.has(pluginInfo.plugin.id))
    .map((pluginInfo): IPluginFilterPatternGroup | null => {
      const patterns = pluginInfo.plugin.defaultFilters ?? [];
      if (patterns.length === 0) {
        return null;
      }

      return {
        pluginId: pluginInfo.plugin.id ?? pluginInfo.plugin.name ?? 'plugin',
        pluginName: pluginInfo.plugin.name ?? pluginInfo.plugin.id ?? 'Plugin',
        patterns: [...new Set(patterns)],
      };
    })
    .filter((group): group is IPluginFilterPatternGroup => group !== null);
}

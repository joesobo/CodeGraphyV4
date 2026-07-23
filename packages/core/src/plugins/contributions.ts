import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';

export function listPluginContributions<TDefinition>(
  plugins: Map<string, CorePluginInfo>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
  disabledPlugins: ReadonlySet<string> = new Set(),
): TDefinition[] {
  const definitions = new Map<string, TDefinition>();
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    try {
      for (const definition of getDefinitions(info.plugin)) {
        definitions.set(getId(definition), definition);
      }
    } catch (error) {
      console.error(
        `[CodeGraphy] Error collecting contributions from ${info.plugin.id}:`,
        error,
      );
    }
  }
  return [...definitions.values()];
}

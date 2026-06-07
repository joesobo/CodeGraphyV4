import type {
  IPlugin,
} from '../../../types/contracts';
import type { IPluginInfoV2 } from '../state/store';

export function listPluginContributions<TDefinition>(
  plugins: Map<string, IPluginInfoV2>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
  disabledPlugins: ReadonlySet<string> = new Set(),
): TDefinition[] {
  const definitionsById = new Map<string, TDefinition>();

  for (const { plugin } of plugins.values()) {
    if (disabledPlugins.has(plugin.id)) {
      continue;
    }

    for (const definition of getDefinitions(plugin)) {
      definitionsById.set(getId(definition), definition);
    }
  }

  return Array.from(definitionsById.values());
}

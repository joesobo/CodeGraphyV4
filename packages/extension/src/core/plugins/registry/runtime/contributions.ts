import type {
  IPlugin,
} from '../../types/contracts';
import type { IPluginInfoV2 } from './state';

export function listPluginContributions<TDefinition>(
  plugins: Map<string, IPluginInfoV2>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
): TDefinition[] {
  const definitionsById = new Map<string, TDefinition>();

  for (const { plugin } of plugins.values()) {
    for (const definition of getDefinitions(plugin)) {
      definitionsById.set(getId(definition), definition);
    }
  }

  return Array.from(definitionsById.values());
}

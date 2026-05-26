import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';

export function listPluginContributions<TDefinition>(
  plugins: Map<string, CorePluginInfo>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
): TDefinition[] {
  const definitions = new Map<string, TDefinition>();
  for (const info of plugins.values()) {
    for (const definition of getDefinitions(info.plugin)) {
      definitions.set(getId(definition), definition);
    }
  }
  return [...definitions.values()];
}

import type { PluginRegistry } from '../../../core/plugins/registry/manager';

export function listActiveAnalysisPluginIds(
  registry: Pick<PluginRegistry, 'list'>,
  pluginIds: readonly string[] | undefined,
  disabledPlugins: ReadonlySet<string>,
): string[] {
  const candidateIds = pluginIds ?? registry.list()
    .map(({ plugin }) => plugin.id)
    .filter((pluginId): pluginId is string =>
      typeof pluginId === 'string' && pluginId.length > 0,
    );
  return candidateIds.filter(pluginId => !disabledPlugins.has(pluginId));
}

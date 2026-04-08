import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdgeSource } from '../../../shared/graph/types';

export function createQualifiedSourceId(
  plugin: IPlugin | undefined,
  connection: Pick<IConnection, 'sourceId'>,
): string | undefined {
  return plugin && connection.sourceId ? `${plugin.id}:${connection.sourceId}` : undefined;
}

export function createEdgeSource(
  plugin: IPlugin | undefined,
  connection: IConnection,
): IGraphEdgeSource | undefined {
  if (!plugin || !connection.sourceId) {
    return undefined;
  }

  const qualifiedSourceId = createQualifiedSourceId(plugin, connection) as string;
  const pluginSources = plugin.sources ?? [];
  const pluginSource = pluginSources.find((source) => source.id === connection.sourceId);

  return {
    id: qualifiedSourceId,
    pluginId: plugin.id,
    sourceId: connection.sourceId,
    label: pluginSource ? pluginSource.name : connection.sourceId,
    metadata: connection.metadata,
    variant: connection.variant,
  };
}

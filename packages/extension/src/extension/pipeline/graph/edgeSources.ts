import type { IProjectedConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphEdgeSource } from '../../../shared/graph/contracts';
import {
  resolveEdgeSourceIdentity,
} from './edgeSources/identity';

export { createQualifiedSourceId } from './edgeSources/identity';

export function createEdgeSource(
  plugin: IPlugin | undefined,
  connection: IProjectedConnection,
): IGraphEdgeSource | undefined {
  const identity = resolveEdgeSourceIdentity(plugin, connection);
  if (!identity) {
    return undefined;
  }

  const pluginSource = plugin?.sources?.find((source) => source.id === identity.sourceId);

  return {
    id: identity.qualifiedSourceId,
    pluginId: identity.pluginId,
    sourceId: identity.sourceId,
    label: pluginSource ? pluginSource.name : identity.sourceId,
    metadata: connection.metadata,
    variant: connection.variant,
  };
}

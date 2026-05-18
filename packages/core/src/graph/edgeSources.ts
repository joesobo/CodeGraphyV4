import type { IPlugin } from '@codegraphy/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IGraphEdgeSource } from './contracts';
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

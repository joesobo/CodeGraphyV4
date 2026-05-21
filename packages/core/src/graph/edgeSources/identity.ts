import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../analysis/projectedConnection';

export function createQualifiedSourceId(
  plugin: IPlugin | undefined,
  connection: Pick<IProjectedConnection, 'pluginId' | 'sourceId'>,
): string | undefined {
  if (!connection.sourceId) {
    return undefined;
  }

  if (connection.pluginId) {
    return `${connection.pluginId}:${connection.sourceId}`;
  }

  return plugin ? `${plugin.id}:${connection.sourceId}` : undefined;
}

export function resolveEdgeSourceIdentity(
  plugin: IPlugin | undefined,
  connection: IProjectedConnection,
): { pluginId: string; qualifiedSourceId: string; sourceId: string } | undefined {
  const pluginId = connection.pluginId ?? plugin?.id;
  const sourceId = connection.sourceId;
  if (!pluginId || !sourceId) {
    return undefined;
  }

  return {
    pluginId,
    qualifiedSourceId: `${pluginId}:${sourceId}`,
    sourceId,
  };
}

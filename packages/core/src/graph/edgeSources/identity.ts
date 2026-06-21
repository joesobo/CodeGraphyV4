import type { IProjectedConnection } from '../../analysis/projectedConnection';

export function createQualifiedSourceId(
  connection: Pick<IProjectedConnection, 'pluginId' | 'sourceId'>,
): string | undefined {
  if (!connection.sourceId) {
    return undefined;
  }

  if (connection.pluginId) {
    return `${connection.pluginId}:${connection.sourceId}`;
  }

  return undefined;
}

export function resolveEdgeSourceIdentity(
  connection: IProjectedConnection,
): { pluginId: string; qualifiedSourceId: string; sourceId: string } | undefined {
  const pluginId = connection.pluginId;
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

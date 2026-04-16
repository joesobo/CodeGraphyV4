import type { IProjectedConnection, IPlugin } from '../../../../core/plugins/types/contracts';

function splitQualifiedSourceId(
  sourceId: string | undefined,
): { pluginId: string; sourceId: string } | null {
  if (!sourceId) {
    return null;
  }

  const separatorIndex = sourceId.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === sourceId.length - 1) {
    return null;
  }

  return {
    pluginId: sourceId.slice(0, separatorIndex),
    sourceId: sourceId.slice(separatorIndex + 1),
  };
}

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
  const qualifiedSourceId = createQualifiedSourceId(plugin, connection);
  if (!qualifiedSourceId) {
    return undefined;
  }

  const parsedSourceId = splitQualifiedSourceId(qualifiedSourceId);
  const pluginId = connection.pluginId ?? parsedSourceId?.pluginId ?? plugin?.id;
  const sourceId = parsedSourceId?.sourceId ?? connection.sourceId;
  if (!pluginId || !sourceId) {
    return undefined;
  }

  return {
    pluginId,
    qualifiedSourceId,
    sourceId,
  };
}

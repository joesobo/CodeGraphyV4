import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection.js';
import { getConnectionTargetId } from './edgeTargets.js';

export type ConnectionTargetResolver = typeof getConnectionTargetId;

export function createCachedConnectionTargetResolver(
  resolveConnectionTargetId: ConnectionTargetResolver,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
  workspaceRoot: string,
): (plugin: IPlugin | undefined, connection: IProjectedConnection) => string | null {
  const targetIdByPlugin = new Map<string | undefined, Map<string, string | null>>();

  return (plugin, connection) => {
    const cacheKey = createTargetCacheKey(connection);
    if (!cacheKey) {
      return resolveConnectionTargetId(
        plugin,
        connection,
        fileConnections,
        workspaceRoot,
      );
    }

    const pluginKey = plugin?.id;
    const targetIdByKey = targetIdByPlugin.get(pluginKey);
    if (targetIdByKey?.has(cacheKey)) {
      return targetIdByKey.get(cacheKey) ?? null;
    }

    const targetId = resolveConnectionTargetId(
      plugin,
      connection,
      fileConnections,
      workspaceRoot,
    );

    const pluginTargetIds = targetIdByKey ?? new Map<string, string | null>();
    targetIdByPlugin.set(pluginKey, pluginTargetIds);
    pluginTargetIds.set(cacheKey, targetId);

    return targetId;
  };
}

function createTargetCacheKey(
  connection: IProjectedConnection,
): string | undefined {
  if (connection.resolvedPath) {
    return `resolved\0${connection.resolvedPath}`;
  }

  if (connection.specifier) {
    return `specifier\0${connection.specifier}`;
  }

  return undefined;
}

import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection.js';
import { getConnectionTargetId } from './edgeTargets.js';

export type ConnectionTargetResolver = typeof getConnectionTargetId;

export function createCachedConnectionTargetResolver(
  resolveConnectionTargetId: ConnectionTargetResolver,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
  workspaceRoot: string,
): (plugin: IPlugin | undefined, connection: IProjectedConnection) => string | null {
  const targetIdByKey = new Map<string, string | null>();

  return (plugin, connection) => {
    const cacheKey = createTargetCacheKey(plugin, connection);
    if (cacheKey && targetIdByKey.has(cacheKey)) {
      return targetIdByKey.get(cacheKey) ?? null;
    }

    const targetId = resolveConnectionTargetId(
      plugin,
      connection,
      fileConnections,
      workspaceRoot,
    );

    if (cacheKey) {
      targetIdByKey.set(cacheKey, targetId);
    }

    return targetId;
  };
}

function createTargetCacheKey(
  plugin: IPlugin | undefined,
  connection: IProjectedConnection,
): string | undefined {
  if (connection.resolvedPath) {
    return `${plugin?.id ?? ''}\0resolved\0${connection.resolvedPath}`;
  }

  if (connection.specifier) {
    return `${plugin?.id ?? ''}\0specifier\0${connection.specifier}`;
  }

  return undefined;
}

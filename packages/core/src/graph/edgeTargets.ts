import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { isExternalPackageSpecifier } from './packageSpecifiers/match';
import { getExternalPackageNodeId } from './packageSpecifiers/nodeId';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function getConnectionTargetId(
  _plugin: IPlugin | undefined,
  connection: IProjectedConnection,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
  workspaceRoot: string,
): string | null {
  if (connection.resolvedPath) {
    const targetRelative = toRepoRelativeGraphPath(connection.resolvedPath, workspaceRoot);
    return fileConnections.has(targetRelative) ? targetRelative : null;
  }

  return isExternalPackageSpecifier(connection.specifier)
    ? getExternalPackageNodeId(connection.specifier)
    : null;
}

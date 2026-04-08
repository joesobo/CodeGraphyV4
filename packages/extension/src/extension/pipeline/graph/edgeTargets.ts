import * as path from 'path';
import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import { isExternalPackageSpecifier } from './packageSpecifiers/match';
import { getExternalPackageNodeId } from './packageSpecifiers/nodeId';

export function getConnectionTargetId(
  _plugin: IPlugin | undefined,
  connection: IConnection,
  fileConnections: ReadonlyMap<string, IConnection[]>,
  workspaceRoot: string,
): string | null {
  if (connection.resolvedPath) {
    const targetRelative = path.relative(workspaceRoot, connection.resolvedPath);
    return fileConnections.has(targetRelative) ? targetRelative : null;
  }

  if (!isExternalPackageSpecifier(connection.specifier)) {
    return null;
  }

  return getExternalPackageNodeId(connection.specifier);
}

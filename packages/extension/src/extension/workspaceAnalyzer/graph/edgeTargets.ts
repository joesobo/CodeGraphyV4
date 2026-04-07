import * as path from 'path';
import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import { getExternalPackageNodeId } from './packageSpecifiers/nodeId';

export function getConnectionTargetId(
  plugin: IPlugin | undefined,
  connection: IConnection,
  fileConnections: ReadonlyMap<string, IConnection[]>,
  workspaceRoot: string,
): string | null {
  if (connection.resolvedPath) {
    const targetRelative = path.relative(workspaceRoot, connection.resolvedPath);
    return fileConnections.has(targetRelative) ? targetRelative : null;
  }

  if (plugin?.id !== 'codegraphy.typescript') {
    return null;
  }

  return getExternalPackageNodeId(connection.specifier);
}

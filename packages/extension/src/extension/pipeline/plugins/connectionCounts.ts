import * as path from 'path';
import type { IProjectedConnection, IPluginInfo } from '../../../core/plugins/types/contracts';
import { supportsExtension } from './extensions';

export function countPluginConnections(
  pluginInfo: IPluginInfo,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
): number {
  let totalConnections = 0;

  for (const [filePath, connections] of fileConnections) {
    const extension = path.extname(filePath).toLowerCase();
    if (!supportsExtension(pluginInfo.plugin.supportedExtensions, extension)) {
      continue;
    }

    for (const connection of connections) {
      if (connection.pluginId !== pluginInfo.plugin.id || !connection.resolvedPath) {
        continue;
      }

      totalConnections += 1;
    }
  }

  return totalConnections;
}

import * as path from 'path';
import { supportsWorkspaceIndexPluginExtension } from './extensions';

type WorkspaceIndexPluginInfo = {
  plugin: {
    id: string;
    supportedExtensions: string[];
  };
};

export function countWorkspaceIndexPluginConnections(
  pluginInfo: WorkspaceIndexPluginInfo,
  fileConnections: ReadonlyMap<string, Array<{ pluginId?: string; resolvedPath?: string | null }>>,
): number {
  let totalConnections = 0;

  for (const [filePath, connections] of fileConnections) {
    const extension = path.extname(filePath).toLowerCase();
    if (!supportsWorkspaceIndexPluginExtension(pluginInfo.plugin.supportedExtensions, extension)) {
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

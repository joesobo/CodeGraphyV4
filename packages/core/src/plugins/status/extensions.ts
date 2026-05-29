import * as path from 'path';

type WorkspaceIndexPluginInfo = {
  plugin: {
    supportedExtensions: string[];
  };
};

export function supportsWorkspaceIndexPluginExtension(
  pluginExtensions: readonly string[],
  extension: string,
): boolean {
  return pluginExtensions.includes('*') || pluginExtensions.includes(extension);
}

export function getWorkspaceIndexPluginMatchingFiles(
  pluginInfo: WorkspaceIndexPluginInfo,
  discoveredFiles: Array<{ relativePath: string }>,
): Array<{ relativePath: string }> {
  return discoveredFiles.filter((file) => {
    const extension = path.extname(file.relativePath).toLowerCase();
    return supportsWorkspaceIndexPluginExtension(pluginInfo.plugin.supportedExtensions, extension);
  });
}

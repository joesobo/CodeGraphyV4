import * as path from 'path';

type WorkspaceIndexPluginInfo = {
  plugin: {
    supportedExtensions: readonly string[];
  };
};

export function supportsWorkspaceIndexPluginExtension(
  pluginExtensions: readonly string[],
  extension: string,
): boolean {
  const normalizedExtension = normalizeWorkspaceIndexPluginExtension(extension);
  return pluginExtensions.some(pluginExtension => {
    const normalizedPluginExtension = normalizeWorkspaceIndexPluginExtension(pluginExtension);
    return normalizedPluginExtension === '*' || normalizedPluginExtension === normalizedExtension;
  });
}

function normalizeWorkspaceIndexPluginExtension(extension: string): string {
  if (extension === '*') {
    return '*';
  }

  const normalized = extension.toLowerCase();
  return normalized.startsWith('.') ? normalized : `.${normalized}`;
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

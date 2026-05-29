import * as path from 'path';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import type { IPluginInfo } from '../../../core/plugins/types/contracts';

export function supportsExtension(pluginExtensions: readonly string[], extension: string): boolean {
  return pluginExtensions.includes('*') || pluginExtensions.includes(extension);
}

export function getPluginMatchingFiles(
  pluginInfo: IPluginInfo,
  discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[],
): Pick<IDiscoveredFile, 'relativePath'>[] {
  return discoveredFiles.filter((file) => {
    const extension = path.extname(file.relativePath).toLowerCase();
    return supportsExtension(pluginInfo.plugin.supportedExtensions, extension);
  });
}

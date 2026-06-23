import type { IDiscoveredFile } from '../../discovery/contracts';
import { getWorkspaceIndexPluginMatchingFiles } from '../../plugins/status/extensions';
import type { WorkspaceIndexPluginInfo } from './contracts';

export function selectWorkspaceIndexPluginInfos(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
  pluginIds: readonly string[],
): WorkspaceIndexPluginInfo[] {
  const selectedPluginIds = new Set(pluginIds);
  return pluginInfos.filter(({ plugin }) => selectedPluginIds.has(plugin.id));
}

export function selectWorkspaceIndexPluginFiles(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
  discoveredFiles: readonly IDiscoveredFile[],
): IDiscoveredFile[] {
  const matchingFilePaths = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    for (const file of getWorkspaceIndexPluginMatchingFiles(pluginInfo, [...discoveredFiles])) {
      matchingFilePaths.add(file.relativePath);
    }
  }

  return discoveredFiles.filter(file => matchingFilePaths.has(file.relativePath));
}

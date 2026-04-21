import type { IGroup } from '../../../../../shared/settings/groups';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { collectFolderPaths } from '../../../../../shared/graphControls/nests/folders';
import { isExternalPackageNodeId } from '../../../../pipeline/graph/packageSpecifiers/nodeId';
import type { MaterialThemeCacheEntry } from './model';
import { createMaterialGroup } from './groups';
import { resolveIconData } from './icons';
import { findMaterialMatch } from './match';
import type { MaterialIconManifest, MaterialMatch } from './model';

function getDefaultFolderIconName(
  _folderPath: string,
  manifest: MaterialIconManifest,
): string | undefined {
  return manifest.folder;
}

function getFolderMatch(
  folderPath: string,
  theme: MaterialThemeCacheEntry,
): MaterialMatch | undefined {
  const matched = findMaterialMatch(folderPath, theme.manifest, { nodeType: 'folder' });
  if (matched) {
    return matched;
  }

  const iconName = getDefaultFolderIconName(folderPath, theme.manifest);
  if (!iconName) {
    return undefined;
  }

  return {
    iconName,
    key: folderPath,
    kind: 'folderName',
  };
}

export function collectMaterialFolderGroups(
  graphData: IGraphData,
  theme: MaterialThemeCacheEntry,
  folderNodeColor: string,
): IGroup[] {
  const fileNodes = graphData.nodes.filter(
    (node) => node.nodeType !== 'package' && node.nodeType !== 'folder' && !isExternalPackageNodeId(node.id),
  );
  const folderPaths = collectFolderPaths(fileNodes).paths;
  const groupsById = new Map<string, IGroup>();

  for (const folderPath of folderPaths) {
    const match = getFolderMatch(folderPath, theme);
    if (!match) {
      continue;
    }

    const iconData = resolveIconData(theme, match.iconName, 'folder');
    if (!iconData) {
      continue;
    }

    const group = createMaterialGroup(match, iconData, folderNodeColor);
    groupsById.set(group.id, group);
  }

  return [...groupsById.values()];
}

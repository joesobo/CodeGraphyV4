import type { IGroup } from '../../../../../shared/settings/groups';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { collectFolderPaths } from '../../../../../shared/graphControls/nests/folders';
import { isExternalPackageNodeId } from '../../../../pipeline/graph/packageSpecifiers/nodeId';
import type { MaterialThemeCacheEntry } from './model';
import { createMaterialGroup } from './groups';
import { resolveIconData } from './icons';
import { findMaterialMatch } from './match';

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
    const match = findMaterialMatch(folderPath, theme.manifest, { nodeType: 'folder' });
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

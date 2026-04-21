import type { IGroup } from '../../../../../shared/settings/groups';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { isExternalPackageNodeId } from '../../../../pipeline/graph/packageSpecifiers/nodeId';
import type { MaterialThemeCacheEntry } from './model';
import { createMaterialGroup } from './groups';
import { resolveIconData } from './icons';
import { findMaterialMatch } from './match';

export function collectMaterialFileGroups(
  graphData: IGraphData,
  theme: MaterialThemeCacheEntry,
): IGroup[] {
  const groupsById = new Map<string, IGroup>();

  for (const node of graphData.nodes) {
    if (node.nodeType === 'package' || node.nodeType === 'folder' || isExternalPackageNodeId(node.id)) {
      continue;
    }

    const match = findMaterialMatch(node.id, theme.manifest);
    if (!match) {
      continue;
    }

    const iconData = resolveIconData(theme, match.iconName);
    if (!iconData) {
      continue;
    }

    const group = createMaterialGroup(match, iconData);
    groupsById.set(group.id, group);
  }

  return [...groupsById.values()];
}

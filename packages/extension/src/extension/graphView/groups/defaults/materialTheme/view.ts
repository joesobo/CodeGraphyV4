import * as vscode from 'vscode';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';
import { isExternalPackageNodeId } from '../../../../pipeline/graph/packageSpecifiers/nodeId';
import { createMaterialGroup, getManualGroups, getSpecificityScore, sortMaterialGroups } from './groups';
import { resolveIconData } from './icons';
import { loadMaterialTheme } from './manifest';
import { findMaterialMatch } from './match';

export { createMaterialGroup, getSpecificityScore, findMaterialMatch };

export function getMaterialThemeDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
): IGroup[] {
  const theme = loadMaterialTheme(extensionUri);
  if (!theme) {
    return [];
  }

  const groupsById = new Map<string, IGroup>();

  for (const node of graphData.nodes) {
    if (node.nodeType === 'package' || isExternalPackageNodeId(node.id)) {
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

  for (const group of getManualGroups()) {
    groupsById.set(group.id, group);
  }

  return sortMaterialGroups([...groupsById.values()]);
}

import * as vscode from 'vscode';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';
import { createMaterialGroup, getManualGroups, getSpecificityScore, sortMaterialGroups } from './groups';
import { collectMaterialFileGroups } from './files';
import { collectMaterialFolderGroups } from './folders';
import { loadMaterialTheme } from './manifest';
import { findMaterialMatch } from './match';

export { createMaterialGroup, getSpecificityScore, findMaterialMatch };

interface MaterialThemeDefaultOptions {
  folderNodeColor?: string;
  includeFolderMatches?: boolean;
}

export function getMaterialThemeDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
  options: MaterialThemeDefaultOptions = {},
): IGroup[] {
  const theme = loadMaterialTheme(extensionUri);
  if (!theme) {
    return [];
  }

  const groupsById = new Map<string, IGroup>();
  for (const group of collectMaterialFileGroups(graphData, theme)) {
    groupsById.set(group.id, group);
  }

  if (options.includeFolderMatches) {
    for (const group of collectMaterialFolderGroups(
      graphData,
      theme,
      options.folderNodeColor ?? '#7E57C2',
    )) {
      groupsById.set(group.id, group);
    }
  }

  for (const group of getManualGroups()) {
    groupsById.set(group.id, group);
  }

  return sortMaterialGroups([...groupsById.values()]);
}

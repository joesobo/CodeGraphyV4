import type { IGraphData } from '@codegraphy-dev/plugin-api';
import type { IGraphViewDefaultGroupDefinition as IGroup } from '@codegraphy-dev/plugin-api';
import { createMaterialGroup, getManualGroups, getSpecificityScore, sortMaterialGroups } from './groups';
import { collectMaterialFileGroups } from './files';
import { collectMaterialFolderGroups } from './folders';
import { loadMaterialTheme } from './manifest';
import { findMaterialMatch } from './match';

export { createMaterialGroup, getSpecificityScore, findMaterialMatch };

interface MaterialThemeDefaultOptions {
  includeFolderMatches?: boolean;
}

export function getMaterialThemeDefaultGroups(
  graphData: IGraphData,
  extensionRoot?: string,
  options: MaterialThemeDefaultOptions = {},
): IGroup[] {
  const theme = loadMaterialTheme(extensionRoot);
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
    )) {
      groupsById.set(group.id, group);
    }
  }

  for (const group of getManualGroups()) {
    groupsById.set(group.id, group);
  }

  return sortMaterialGroups([...groupsById.values()]);
}

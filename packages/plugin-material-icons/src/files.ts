import type { IGraphViewDefaultGroupDefinition as IGroup } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '@codegraphy-dev/plugin-api';
import { isExternalPackageNodeId } from './graph';
import type { MaterialMatch, MaterialThemeCacheEntry } from './model';
import { createMaterialGroup } from './groups';
import { resolveIconData } from './icons';
import { findMaterialMatch } from './match';
import { getMaterialBaseName } from './paths';

function hasPathSpecificFileNameRules(
  baseName: string,
  theme: MaterialThemeCacheEntry,
): boolean {
  return Boolean(theme.pathMatchers.fileNames?.pathRulesByLowerBaseName.has(baseName.toLowerCase()));
}

function findCachedMaterialFileMatch(
  nodeId: string,
  theme: MaterialThemeCacheEntry,
  matchCacheByBaseName: Map<string, MaterialMatch | null>,
): MaterialMatch | undefined {
  const baseName = getMaterialBaseName(nodeId);
  if (!baseName || hasPathSpecificFileNameRules(baseName, theme)) {
    return findMaterialMatch(nodeId, theme.manifest, {
      extensionMatcher: theme.extensionMatcher,
      pathMatchers: theme.pathMatchers,
    });
  }

  const cached = matchCacheByBaseName.get(baseName);
  if (cached !== undefined) {
    return cached ?? undefined;
  }

  const match = findMaterialMatch(baseName, theme.manifest, {
    extensionMatcher: theme.extensionMatcher,
    pathMatchers: theme.pathMatchers,
  });
  matchCacheByBaseName.set(baseName, match ?? null);
  return match;
}

export function collectMaterialFileGroups(
  graphData: IGraphData,
  theme: MaterialThemeCacheEntry,
): IGroup[] {
  const groupsById = new Map<string, IGroup>();
  const matchCacheByBaseName = new Map<string, MaterialMatch | null>();

  for (const node of graphData.nodes) {
    if (node.nodeType === 'package' || node.nodeType === 'folder' || isExternalPackageNodeId(node.id)) {
      continue;
    }

    const match = findCachedMaterialFileMatch(node.id, theme, matchCacheByBaseName);
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

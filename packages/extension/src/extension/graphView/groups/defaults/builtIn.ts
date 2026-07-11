import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { createDefaultNodeVisibility } from '../../../../shared/graphControls/defaults/maps';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { getSymbolDefaultGroups } from './symbols';

const builtInDefaultGroupsCache = new WeakMap<IGraphData, Map<string, IGroup[]>>();

function getExtensionUriCacheKey(extensionUri: vscode.Uri): string {
  return extensionUri.fsPath || extensionUri.path || extensionUri.toString();
}

function getBuiltInDefaultGroupsCacheKey(
  extensionUri: vscode.Uri,
  includeFolderMatches: boolean,
): string {
  return `${getExtensionUriCacheKey(extensionUri)}|folder:${includeFolderMatches ? '1' : '0'}`;
}

export function getBuiltInGraphViewDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
): IGroup[] {
  const config = getCodeGraphyConfiguration();
  const defaultNodeVisibility = createDefaultNodeVisibility();
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const includeFolderMatches = configuredNodeVisibility.folder ?? defaultNodeVisibility.folder;
  const cacheKey = getBuiltInDefaultGroupsCacheKey(extensionUri, includeFolderMatches);
  const cachedGroups = builtInDefaultGroupsCache.get(graphData)?.get(cacheKey);
  if (cachedGroups) {
    return cachedGroups;
  }

  const groups = [
    ...getSymbolDefaultGroups(graphData),
  ];

  const cachedGroupsByInput = builtInDefaultGroupsCache.get(graphData) ?? new Map<string, IGroup[]>();
  cachedGroupsByInput.set(cacheKey, groups);
  builtInDefaultGroupsCache.set(graphData, cachedGroupsByInput);
  return groups;
}

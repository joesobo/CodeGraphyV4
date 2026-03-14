import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGroup } from '../../shared/types';

interface GraphViewGroupConfigInspect<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface GraphViewGroupConfig {
  get<T>(section: string, defaultValue: T): T;
  inspect<T>(section: string): GraphViewGroupConfigInspect<T> | undefined;
}

interface GraphViewGroupWorkspaceState {
  get<T>(key: string): T | undefined;
}

export interface GraphViewGroupState {
  userGroups: IGroup[];
  filterPatterns: string[];
  hiddenPluginGroupIds: Set<string>;
  legacyGroupsToMigrate?: IGroup[];
}

interface GraphViewGroupsUpdatedMessageOptions {
  workspaceFolder?: { uri: vscode.Uri };
  asWebviewUri?(uri: vscode.Uri): { toString(): string };
  resolvePluginAssetPath(assetPath: string, pluginId?: string): string | undefined;
}

export function loadGraphViewGroupState(
  config: GraphViewGroupConfig,
  workspaceState: GraphViewGroupWorkspaceState,
): GraphViewGroupState {
  const groupsInspect = config.inspect<IGroup[]>('groups');
  const patternsInspect = config.inspect<string[]>('filterPatterns');

  const configuredGroups = groupsInspect?.workspaceValue ?? groupsInspect?.globalValue;
  const configuredFilterPatterns =
    patternsInspect?.workspaceValue ?? patternsInspect?.globalValue;

  if (configuredGroups) {
    return {
      userGroups: configuredGroups,
      filterPatterns:
        configuredFilterPatterns ??
        workspaceState.get<string[]>('codegraphy.filterPatterns') ??
        [],
      hiddenPluginGroupIds: new Set(config.get<string[]>('hiddenPluginGroups', [])),
    };
  }

  const legacyGroups = workspaceState.get<IGroup[]>('codegraphy.groups') ?? [];
  const userGroups = legacyGroups.filter((group) => !group.id.startsWith('plugin:'));

  return {
    userGroups,
    filterPatterns:
      configuredFilterPatterns ??
      workspaceState.get<string[]>('codegraphy.filterPatterns') ??
      [],
    hiddenPluginGroupIds: new Set(config.get<string[]>('hiddenPluginGroups', [])),
    legacyGroupsToMigrate: legacyGroups.length > 0 ? userGroups : undefined,
  };
}

export function buildGraphViewGroupsUpdatedMessage(
  groups: IGroup[],
  options: GraphViewGroupsUpdatedMessageOptions,
): Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }> {
  return {
    type: 'GROUPS_UPDATED',
    payload: {
      groups: groups.map((group) => {
        if (!group.imagePath) return group;

        const pluginMatch = group.id.match(/^plugin:([^:]+):/);
        if (pluginMatch) {
          return {
            ...group,
            imageUrl: options.resolvePluginAssetPath(group.imagePath, pluginMatch[1]),
          };
        }

        const inheritedMatch = group.imagePath.match(/^plugin:([^:]+):(.+)$/);
        if (inheritedMatch) {
          const [, pluginId, relativePath] = inheritedMatch;
          return {
            ...group,
            imageUrl: options.resolvePluginAssetPath(relativePath, pluginId),
          };
        }

        if (options.workspaceFolder && options.asWebviewUri) {
          return {
            ...group,
            imageUrl: options.asWebviewUri(
              vscode.Uri.joinPath(options.workspaceFolder.uri, group.imagePath),
            ).toString(),
          };
        }

        return group;
      }),
    },
  };
}

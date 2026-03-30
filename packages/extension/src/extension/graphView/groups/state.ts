import type { IGroup } from '../../../shared/settings/groups';

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

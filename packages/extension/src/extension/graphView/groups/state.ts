import type { IGroup } from '../../../shared/settings/groups';

interface GraphViewGroupConfigInspect<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface GraphViewGroupConfig {
  get<T>(section: string, defaultValue: T): T;
  inspect<T>(section: string): GraphViewGroupConfigInspect<T> | undefined;
}

export interface GraphViewGroupState {
  userGroups: IGroup[];
  filterPatterns: string[];
}

export function loadGraphViewGroupState(
  config: GraphViewGroupConfig,
): GraphViewGroupState {
  const groupsInspect = config.inspect<IGroup[]>('legend');
  const patternsInspect = config.inspect<string[]>('filterPatterns');

  const configuredGroups = groupsInspect?.workspaceValue ?? groupsInspect?.globalValue;
  const configuredFilterPatterns =
    patternsInspect?.workspaceValue ?? patternsInspect?.globalValue;

  if (configuredGroups) {
    return {
      userGroups: configuredGroups,
      filterPatterns: configuredFilterPatterns ?? [],
    };
  }

  return {
    userGroups: [],
    filterPatterns: configuredFilterPatterns ?? [],
  };
}

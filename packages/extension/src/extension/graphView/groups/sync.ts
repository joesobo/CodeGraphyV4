import type { IGroup } from '../../../shared/settings/groups';
import type { GraphViewGroupState } from './state';

export interface GraphViewGroupSyncState {
  userGroups: IGroup[];
  hiddenPluginGroupIds: Set<string>;
  filterPatterns: string[];
}

export interface GraphViewGroupSyncHandlers {
  recomputeGroups(): void;
  persistLegacyGroups(groups: IGroup[]): void;
  clearLegacyGroups(): void;
}

export function applyLoadedGraphViewGroupState(
  groupState: GraphViewGroupState,
  state: GraphViewGroupSyncState,
  handlers: GraphViewGroupSyncHandlers,
): void {
  state.userGroups = groupState.userGroups;
  state.hiddenPluginGroupIds = groupState.hiddenPluginGroupIds;
  state.filterPatterns = groupState.filterPatterns;
  handlers.recomputeGroups();

  if (groupState.legacyGroupsToMigrate) {
    handlers.persistLegacyGroups(groupState.legacyGroupsToMigrate);
    handlers.clearLegacyGroups();
  }
}

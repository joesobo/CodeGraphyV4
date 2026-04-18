import type { IGroup } from '../../../shared/settings/groups';
import type { GraphViewGroupState } from './state';

export interface GraphViewGroupSyncState {
  userGroups: IGroup[];
  filterPatterns: string[];
}

export interface GraphViewGroupSyncHandlers {
  recomputeGroups(): void;
}

export function applyLoadedGraphViewGroupState(
  groupState: GraphViewGroupState,
  state: GraphViewGroupSyncState,
  handlers: GraphViewGroupSyncHandlers,
): void {
  state.userGroups = groupState.userGroups;
  state.filterPatterns = groupState.filterPatterns;
  handlers.recomputeGroups();
}

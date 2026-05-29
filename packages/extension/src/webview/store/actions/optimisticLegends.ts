import type { GraphState } from '../state';
import {
  clearPendingGroupUpdate,
  createPendingUserGroupsUpdate,
  mergePendingGroupUpdate,
} from '../optimistic/groups/updates';
import type { SetState } from './types';

function replaceUserGroups(
  currentGroups: GraphState['legends'],
  userGroups: GraphState['legends'],
): GraphState['legends'] {
  return [
    ...userGroups,
    ...currentGroups.filter((group) => group.isPluginDefault),
  ];
}

export function createOptimisticLegendActions(set: SetState) {
  return {
    setOptimisticLegendUpdate: (groupId: string, updates: Partial<GraphState['legends'][number]>) =>
      set((state) => ({
        optimisticLegendUpdates: mergePendingGroupUpdate(
          state.optimisticLegendUpdates,
          groupId,
          updates,
        ),
      })),
    setOptimisticLegendUpdates: (updatesByLegendId: Record<string, Partial<GraphState['legends'][number]>>) =>
      set((state) => ({
        optimisticLegendUpdates: Object.entries(updatesByLegendId).reduce(
          (pending, [groupId, updates]) => mergePendingGroupUpdate(pending, groupId, updates),
          state.optimisticLegendUpdates,
        ),
      })),
    clearOptimisticLegendUpdate: (groupId: string) =>
      set((state) => ({
        optimisticLegendUpdates: clearPendingGroupUpdate(
          state.optimisticLegendUpdates,
          groupId,
        ),
      })),
    setOptimisticUserLegends: (legends: GraphState['legends']) =>
      set((state) => ({
        legends: replaceUserGroups(state.legends, legends),
        optimisticUserLegends: createPendingUserGroupsUpdate(legends),
      })),
  };
}

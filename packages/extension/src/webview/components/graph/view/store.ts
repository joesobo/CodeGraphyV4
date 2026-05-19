import { useGraphStore } from '../../../store/state';
import type { GraphState } from '../../../store/state';
import { hasOrganizeGraphSectionContributions } from '../organize/contributions';

export type GraphViewStoreState = Pick<
  GraphState,
  | 'bidirectionalMode'
  | 'currentCommitSha'
  | 'dagMode'
  | 'directionMode'
  | 'favorites'
  | 'graphLayout'
  | 'graphViewContributionStatuses'
  | 'graphMode'
  | 'nodeSizeMode'
  | 'particleSize'
  | 'particleSpeed'
  | 'physicsPaused'
  | 'physicsSettings'
  | 'pluginContextMenuItems'
  | 'setGraphMode'
  | 'showLabels'
  | 'timelineActive'
  | 'timelineCommits'
  | 'depthMode'
> & {
  graphSectionsAvailable: boolean;
};

export function useGraphViewStoreState(): GraphViewStoreState {
  return {
    bidirectionalMode: useGraphStore(state => state.bidirectionalMode),
    currentCommitSha: useGraphStore(state => state.currentCommitSha),
    dagMode: useGraphStore(state => state.dagMode),
    depthMode: useGraphStore(state => state.depthMode),
    directionMode: useGraphStore(state => state.directionMode),
    favorites: useGraphStore(state => state.favorites),
    graphLayout: useGraphStore(state => state.graphLayout),
    graphViewContributionStatuses: useGraphStore(state => state.graphViewContributionStatuses),
    graphSectionsAvailable: useGraphStore(state =>
      hasOrganizeGraphSectionContributions(state.graphViewContributionStatuses)
    ),
    graphMode: useGraphStore(state => state.graphMode),
    nodeSizeMode: useGraphStore(state => state.nodeSizeMode),
    particleSize: useGraphStore(state => state.particleSize),
    particleSpeed: useGraphStore(state => state.particleSpeed),
    physicsPaused: useGraphStore(state => state.physicsPaused),
    physicsSettings: useGraphStore(state => state.physicsSettings),
    pluginContextMenuItems: useGraphStore(state => state.pluginContextMenuItems),
    setGraphMode: useGraphStore(state => state.setGraphMode),
    showLabels: useGraphStore(state => state.showLabels),
    timelineActive: useGraphStore(state => state.timelineActive),
    timelineCommits: useGraphStore(state => state.timelineCommits),
  };
}

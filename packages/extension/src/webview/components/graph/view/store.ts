import { useGraphStore } from '../../../store/state';
import type { GraphState } from '../../../store/state';

export type GraphViewStoreState = Pick<
  GraphState,
  | 'bidirectionalMode'
  | 'dagMode'
  | 'directionMode'
  | 'favorites'
  | 'graphViewContributionStatuses'
  | 'nodeSizeMode'
  | 'particleSize'
  | 'particleSpeed'
  | 'physicsPaused'
  | 'physicsSettings'
  | 'pluginContextMenuItems'
  | 'pluginStatuses'
  | 'showLabels'
  | 'depthMode'
>;

export function useGraphViewStoreState(): GraphViewStoreState {
  return {
    bidirectionalMode: useGraphStore(state => state.bidirectionalMode),
    dagMode: useGraphStore(state => state.dagMode),
    depthMode: useGraphStore(state => state.depthMode),
    directionMode: useGraphStore(state => state.directionMode),
    favorites: useGraphStore(state => state.favorites),
    graphViewContributionStatuses: useGraphStore(state => state.graphViewContributionStatuses),
    nodeSizeMode: useGraphStore(state => state.nodeSizeMode),
    particleSize: useGraphStore(state => state.particleSize),
    particleSpeed: useGraphStore(state => state.particleSpeed),
    physicsPaused: useGraphStore(state => state.physicsPaused),
    physicsSettings: useGraphStore(state => state.physicsSettings),
    pluginContextMenuItems: useGraphStore(state => state.pluginContextMenuItems),
    pluginStatuses: useGraphStore(state => state.pluginStatuses),
    showLabels: useGraphStore(state => state.showLabels),
  };
}

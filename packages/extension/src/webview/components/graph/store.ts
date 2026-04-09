import { useGraphStore } from '../../store/state';
import type { GraphState } from '../../store/state';

export type GraphViewStoreState = Pick<
  GraphState,
  | 'activeViewId'
  | 'bidirectionalMode'
  | 'dagMode'
  | 'directionColor'
  | 'directionMode'
  | 'favorites'
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
> & { depthMode?: boolean };

export function useGraphViewStoreState(): GraphViewStoreState {
  return {
    activeViewId: useGraphStore(state => state.activeViewId),
    bidirectionalMode: useGraphStore(state => state.bidirectionalMode),
    dagMode: useGraphStore(state => state.dagMode),
    depthMode: useGraphStore(state => state.depthMode),
    directionColor: useGraphStore(state => state.directionColor),
    directionMode: useGraphStore(state => state.directionMode),
    favorites: useGraphStore(state => state.favorites),
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
  };
}

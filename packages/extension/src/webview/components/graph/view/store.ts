import { useGraphStore } from '../../../store/state';
import type { GraphState } from '../../../store/state';

export type GraphViewStoreState = Pick<
  GraphState,
  | 'bidirectionalMode'
  | 'directionMode'
  | 'favorites'
  | 'nodeSizeMode'
  | 'particleSize'
  | 'particleSpeed'
  | 'physicsSettings'
  | 'showFps'
  | 'showLabels'
  | 'showMinimap'
  | 'depthMode'
>;

export function useGraphViewStoreState(): GraphViewStoreState {
  return {
    bidirectionalMode: useGraphStore(state => state.bidirectionalMode),
    depthMode: useGraphStore(state => state.depthMode),
    directionMode: useGraphStore(state => state.directionMode),
    favorites: useGraphStore(state => state.favorites),
    nodeSizeMode: useGraphStore(state => state.nodeSizeMode),
    particleSize: useGraphStore(state => state.particleSize),
    particleSpeed: useGraphStore(state => state.particleSpeed),
    physicsSettings: useGraphStore(state => state.physicsSettings),
    showFps: useGraphStore(state => state.showFps),
    showLabels: useGraphStore(state => state.showLabels),
    showMinimap: useGraphStore(state => state.showMinimap),
  };
}

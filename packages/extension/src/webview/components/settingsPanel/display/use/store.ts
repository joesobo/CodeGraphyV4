import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import { useGraphStore } from '../../../../store/state';

export type DisplayStoreState = {
  bidirectionalMode: BidirectionalEdgeMode;
  depthLimit: number;
  depthMode: boolean;
  directionMode: DirectionMode;
  graphHasIndex: boolean;
  maxDepthLimit: number;
  particleSize: number;
  particleSpeed: number;
  setBidirectionalMode: (mode: BidirectionalEdgeMode) => void;
  setDepthMode: (depthMode: boolean) => void;
  setDirectionMode: (mode: DirectionMode) => void;
  setParticleSize: (size: number) => void;
  setParticleSpeed: (speed: number) => void;
  setShowLabels: (showLabels: boolean) => void;
  setShowOrphans: (showOrphans: boolean) => void;
  showLabels: boolean;
  showOrphans: boolean;
};

export function useDisplayStore(): DisplayStoreState {
  const bidirectionalMode = useGraphStore((state) => state.bidirectionalMode);
  const depthLimit = useGraphStore((state) => state.depthLimit);
  const depthMode = useGraphStore((state) => state.depthMode);
  const directionMode = useGraphStore((state) => state.directionMode);
  const graphHasIndex = useGraphStore((state) => state.graphHasIndex);
  const maxDepthLimit = useGraphStore((state) => state.maxDepthLimit);
  const particleSize = useGraphStore((state) => state.particleSize);
  const particleSpeed = useGraphStore((state) => state.particleSpeed);
  const setBidirectionalMode = useGraphStore((state) => state.setBidirectionalMode);
  const setDepthMode = useGraphStore((state) => state.setDepthMode);
  const setDirectionMode = useGraphStore((state) => state.setDirectionMode);
  const setParticleSize = useGraphStore((state) => state.setParticleSize);
  const setParticleSpeed = useGraphStore((state) => state.setParticleSpeed);
  const setShowLabels = useGraphStore((state) => state.setShowLabels);
  const setShowOrphans = useGraphStore((state) => state.setShowOrphans);
  const showLabels = useGraphStore((state) => state.showLabels);
  const showOrphans = useGraphStore((state) => state.showOrphans);

  return {
    bidirectionalMode,
    depthLimit,
    depthMode,
    directionMode,
    graphHasIndex,
    maxDepthLimit,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDepthMode,
    setDirectionMode,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    setShowOrphans,
    showLabels,
    showOrphans,
  };
}

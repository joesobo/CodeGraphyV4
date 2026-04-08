import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import { useGraphStore } from '../../../../store/state';

export type DisplayStoreState = {
  bidirectionalMode: BidirectionalEdgeMode;
  directionColor: string;
  directionMode: DirectionMode;
  particleSize: number;
  particleSpeed: number;
  setBidirectionalMode: (mode: BidirectionalEdgeMode) => void;
  setDirectionColor: (color: string) => void;
  setDirectionMode: (mode: DirectionMode) => void;
  setParticleSize: (size: number) => void;
  setParticleSpeed: (speed: number) => void;
  setShowLabels: (showLabels: boolean) => void;
  showLabels: boolean;
};

export function useDisplayStore(): DisplayStoreState {
  const bidirectionalMode = useGraphStore((state) => state.bidirectionalMode);
  const directionColor = useGraphStore((state) => state.directionColor);
  const directionMode = useGraphStore((state) => state.directionMode);
  const particleSize = useGraphStore((state) => state.particleSize);
  const particleSpeed = useGraphStore((state) => state.particleSpeed);
  const setBidirectionalMode = useGraphStore((state) => state.setBidirectionalMode);
  const setDirectionColor = useGraphStore((state) => state.setDirectionColor);
  const setDirectionMode = useGraphStore((state) => state.setDirectionMode);
  const setParticleSize = useGraphStore((state) => state.setParticleSize);
  const setParticleSpeed = useGraphStore((state) => state.setParticleSpeed);
  const setShowLabels = useGraphStore((state) => state.setShowLabels);
  const showLabels = useGraphStore((state) => state.showLabels);

  return {
    bidirectionalMode,
    directionColor,
    directionMode,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDirectionColor,
    setDirectionMode,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    showLabels,
  };
}

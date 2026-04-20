import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import { useGraphStore } from '../../../../store/state';

export type DisplayStoreState = {
  bidirectionalMode: BidirectionalEdgeMode;
  directionColor: string;
  directionMode: DirectionMode;
  maxFiles: number;
  particleSize: number;
  particleSpeed: number;
  setBidirectionalMode: (mode: BidirectionalEdgeMode) => void;
  setDirectionColor: (color: string) => void;
  setDirectionMode: (mode: DirectionMode) => void;
  setMaxFiles: (maxFiles: number) => void;
  setParticleSize: (size: number) => void;
  setParticleSpeed: (speed: number) => void;
  setShowLabels: (showLabels: boolean) => void;
  setShowOrphans: (showOrphans: boolean) => void;
  showLabels: boolean;
  showOrphans: boolean;
};

export function useDisplayStore(): DisplayStoreState {
  const bidirectionalMode = useGraphStore((state) => state.bidirectionalMode);
  const directionColor = useGraphStore((state) => state.directionColor);
  const directionMode = useGraphStore((state) => state.directionMode);
  const maxFiles = useGraphStore((state) => state.maxFiles);
  const particleSize = useGraphStore((state) => state.particleSize);
  const particleSpeed = useGraphStore((state) => state.particleSpeed);
  const setBidirectionalMode = useGraphStore((state) => state.setBidirectionalMode);
  const setDirectionColor = useGraphStore((state) => state.setDirectionColor);
  const setDirectionMode = useGraphStore((state) => state.setDirectionMode);
  const setMaxFiles = useGraphStore((state) => state.setMaxFiles);
  const setParticleSize = useGraphStore((state) => state.setParticleSize);
  const setParticleSpeed = useGraphStore((state) => state.setParticleSpeed);
  const setShowLabels = useGraphStore((state) => state.setShowLabels);
  const setShowOrphans = useGraphStore((state) => state.setShowOrphans);
  const showLabels = useGraphStore((state) => state.showLabels);
  const showOrphans = useGraphStore((state) => state.showOrphans);

  return {
    bidirectionalMode,
    directionColor,
    directionMode,
    maxFiles,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDirectionColor,
    setDirectionMode,
    setMaxFiles,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    setShowOrphans,
    showLabels,
    showOrphans,
  };
}

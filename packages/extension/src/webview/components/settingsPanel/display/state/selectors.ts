import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import {
  particleSpeedToDisplay,
  shouldShowParticleControls,
} from './model';
import type { ModeButtonOption } from '../ModeButtons';
import {
  createBidirectionalOptions,
  createDirectionOptions,
} from './modeOptions';

export type DisplayViewState = {
  bidirectionalOptions: ModeButtonOption<BidirectionalEdgeMode>[];
  directionOptions: ModeButtonOption<DirectionMode>[];
  displayParticleSpeed: number;
  showParticleControls: boolean;
};

export function getDisplayViewState({
  bidirectionalMode,
  directionMode,
  particleSpeed,
}: {
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  particleSpeed: number;
}): DisplayViewState {
  return {
    bidirectionalOptions: createBidirectionalOptions(bidirectionalMode),
    directionOptions: createDirectionOptions(directionMode),
    displayParticleSpeed: particleSpeedToDisplay(particleSpeed),
    showParticleControls: shouldShowParticleControls(directionMode),
  };
}

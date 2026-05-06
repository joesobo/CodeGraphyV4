import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import {
  particleSpeedToDisplay,
  shouldShowParticleControls,
} from './model';
import type { ModeButtonOption } from '../ModeButtons';
import {
  createBidirectionalOptions,
  createDirectionOptions,
  createGraphModeOptions,
} from './modeOptions';

export type DisplayViewState = {
  bidirectionalOptions: ModeButtonOption<BidirectionalEdgeMode>[];
  directionOptions: ModeButtonOption<DirectionMode>[];
  displayParticleSpeed: number;
  graphModeOptions: ModeButtonOption<'2d' | '3d'>[];
  showParticleControls: boolean;
};

export function getDisplayViewState({
  bidirectionalMode,
  directionMode,
  graphMode,
  particleSpeed,
}: {
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
  particleSpeed: number;
}): DisplayViewState {
  return {
    bidirectionalOptions: createBidirectionalOptions(bidirectionalMode),
    directionOptions: createDirectionOptions(directionMode),
    displayParticleSpeed: particleSpeedToDisplay(particleSpeed),
    graphModeOptions: createGraphModeOptions(graphMode),
    showParticleControls: shouldShowParticleControls(directionMode),
  };
}

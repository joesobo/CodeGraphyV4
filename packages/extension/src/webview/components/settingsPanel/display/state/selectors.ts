import { DEFAULT_DIRECTION_COLOR } from '../../../../../shared/fileColors';
import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import {
  particleSpeedToDisplay,
  resolveDisplayColor,
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
  resolvedDirectionColor: string;
  showParticleControls: boolean;
};

export function getDisplayViewState({
  bidirectionalMode,
  directionColor,
  directionMode,
  particleSpeed,
}: {
  bidirectionalMode: BidirectionalEdgeMode;
  directionColor: string;
  directionMode: DirectionMode;
  particleSpeed: number;
}): DisplayViewState {
  return {
    bidirectionalOptions: createBidirectionalOptions(bidirectionalMode),
    directionOptions: createDirectionOptions(directionMode),
    displayParticleSpeed: particleSpeedToDisplay(particleSpeed),
    resolvedDirectionColor: resolveDisplayColor(directionColor, DEFAULT_DIRECTION_COLOR),
    showParticleControls: shouldShowParticleControls(directionMode),
  };
}

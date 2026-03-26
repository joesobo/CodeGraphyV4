import {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  type BidirectionalEdgeMode,
  type DirectionMode,
} from '../../../../shared/contracts';
import {
  particleSpeedToDisplay,
  resolveDisplayColor,
  shouldShowFolderNodeColor,
  shouldShowParticleControls,
} from './model';
import type { ModeButtonOption } from './ModeButtons';
import {
  createBidirectionalOptions,
  createDirectionOptions,
} from './modeOptions';

export type DisplayViewState = {
  bidirectionalOptions: ModeButtonOption<BidirectionalEdgeMode>[];
  directionOptions: ModeButtonOption<DirectionMode>[];
  displayParticleSpeed: number;
  resolvedDirectionColor: string;
  resolvedFolderNodeColor: string;
  showFolderNodeColor: boolean;
  showParticleControls: boolean;
};

export function getDisplayViewState({
  activeViewId,
  bidirectionalMode,
  directionColor,
  directionMode,
  folderNodeColor,
  particleSpeed,
}: {
  activeViewId: string;
  bidirectionalMode: BidirectionalEdgeMode;
  directionColor: string;
  directionMode: DirectionMode;
  folderNodeColor: string;
  particleSpeed: number;
}): DisplayViewState {
  return {
    bidirectionalOptions: createBidirectionalOptions(bidirectionalMode),
    directionOptions: createDirectionOptions(directionMode),
    displayParticleSpeed: particleSpeedToDisplay(particleSpeed),
    resolvedDirectionColor: resolveDisplayColor(directionColor, DEFAULT_DIRECTION_COLOR),
    resolvedFolderNodeColor: resolveDisplayColor(folderNodeColor, DEFAULT_FOLDER_NODE_COLOR),
    showFolderNodeColor: shouldShowFolderNodeColor(activeViewId),
    showParticleControls: shouldShowParticleControls(directionMode),
  };
}

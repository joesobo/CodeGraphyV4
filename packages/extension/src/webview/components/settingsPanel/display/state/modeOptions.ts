import type { BidirectionalEdgeMode, DirectionMode } from '../../../../../shared/settings/modes';
import type { ModeButtonOption } from '../ModeButtons';
import { getSettingsToggleButtonState } from './model';

export function createDirectionOptions(
  directionMode: DirectionMode,
): ModeButtonOption<DirectionMode>[] {
  const arrowsButton = getSettingsToggleButtonState(directionMode, 'arrows');
  const particlesButton = getSettingsToggleButtonState(directionMode, 'particles');
  const noneButton = getSettingsToggleButtonState(directionMode, 'none');

  return [
    {
      value: 'arrows',
      label: 'Arrows',
      pressed: arrowsButton.pressed,
      variant: arrowsButton.variant,
    },
    {
      value: 'particles',
      label: 'Particles',
      pressed: particlesButton.pressed,
      variant: particlesButton.variant,
    },
    {
      value: 'none',
      label: 'None',
      pressed: noneButton.pressed,
      variant: noneButton.variant,
    },
  ];
}

export function createBidirectionalOptions(
  bidirectionalMode: BidirectionalEdgeMode,
): ModeButtonOption<BidirectionalEdgeMode>[] {
  const separateButton = getSettingsToggleButtonState(bidirectionalMode, 'separate');
  const combinedButton = getSettingsToggleButtonState(bidirectionalMode, 'combined');

  return [
    {
      value: 'separate',
      label: 'Separate',
      pressed: separateButton.pressed,
      variant: separateButton.variant,
    },
    {
      value: 'combined',
      label: 'Combined',
      pressed: combinedButton.pressed,
      variant: combinedButton.variant,
    },
  ];
}

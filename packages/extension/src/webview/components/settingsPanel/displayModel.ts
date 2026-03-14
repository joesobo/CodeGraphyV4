import type { DirectionMode } from '../../../shared/types';
import { isHexColor } from './model';

export interface SettingsToggleButtonState {
  pressed: boolean;
  variant: 'default' | 'secondary';
}

export function getSettingsToggleButtonState<T extends string>(
  selectedValue: T,
  optionValue: T
): SettingsToggleButtonState {
  const pressed = selectedValue === optionValue;
  return {
    pressed,
    variant: pressed ? 'default' : 'secondary',
  };
}

export function resolveDisplayColor(value: string, fallback: string): string {
  return isHexColor(value) ? value : fallback;
}

export function shouldShowFolderNodeColor(activeViewId: string): boolean {
  return activeViewId === 'codegraphy.folder';
}

export function shouldShowParticleControls(directionMode: DirectionMode): boolean {
  return directionMode === 'particles';
}

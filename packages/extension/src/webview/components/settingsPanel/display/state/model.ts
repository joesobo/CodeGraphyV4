import type { DirectionMode } from '../../../../../shared/settings/modes';

const PARTICLE_SPEED_MIN_INTERNAL = 0.0005;
const PARTICLE_SPEED_MAX_INTERNAL = 0.005;
const PARTICLE_SPEED_MIN_DISPLAY = 1;
const PARTICLE_SPEED_MAX_DISPLAY = 10;

export interface SettingsToggleButtonState {
  pressed: boolean;
  variant: 'default' | 'secondary';
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
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

export function shouldShowParticleControls(directionMode: DirectionMode): boolean {
  return directionMode === 'particles';
}

export function particleSpeedToDisplay(speed: number): number {
  const clamped = Math.min(
    PARTICLE_SPEED_MAX_INTERNAL,
    Math.max(PARTICLE_SPEED_MIN_INTERNAL, speed)
  );
  const ratio =
    (clamped - PARTICLE_SPEED_MIN_INTERNAL) /
    (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL);
  return PARTICLE_SPEED_MIN_DISPLAY + ratio * (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
}

export function particleSpeedFromDisplay(level: number): number {
  const clamped = Math.min(
    PARTICLE_SPEED_MAX_DISPLAY,
    Math.max(PARTICLE_SPEED_MIN_DISPLAY, level)
  );
  const ratio =
    (clamped - PARTICLE_SPEED_MIN_DISPLAY) /
    (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
  return Number(
    (
      PARTICLE_SPEED_MIN_INTERNAL +
      ratio * (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL)
    ).toFixed(6)
  );
}

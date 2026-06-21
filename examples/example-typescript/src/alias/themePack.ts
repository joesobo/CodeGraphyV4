import type { PaletteMood } from '../types';

export function loadThemePack(mood: PaletteMood): string {
  return `Loaded theme pack for ${mood}`;
}

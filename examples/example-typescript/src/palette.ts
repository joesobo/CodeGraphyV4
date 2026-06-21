import { getAccentSwatch } from './harmony';
import { normalizeMood, PaletteTheme } from './types';

export function buildPalette(mood: string): string {
  return [
    `Palette: ${normalizeMood(mood)} ${PaletteTheme.Neon}`,
    getAccentSwatch(mood),
  ].join('\n');
}

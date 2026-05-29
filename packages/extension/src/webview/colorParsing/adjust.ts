import { parseColor } from './parse';
import type { ParsedColor } from './types';
import { isFullyTransparentColor } from './transparent';

const LIGHT_THEME_DARKEN_FACTOR = 0.7;

function darkenChannel(channel: number): number {
  return Math.round(channel * LIGHT_THEME_DARKEN_FACTOR);
}

function formatHexChannel(channel: number): string {
  return darkenChannel(channel).toString(16).padStart(2, '0');
}

function formatLightThemeColor(color: ParsedColor): string {
  return `#${formatHexChannel(color.r)}${formatHexChannel(color.g)}${formatHexChannel(color.b)}`;
}

export function adjustColorForLightTheme(color: string): string {
  if (isFullyTransparentColor(color)) {
    return color;
  }

  const rgb = parseColor(color);
  return rgb ? formatLightThemeColor(rgb) : color;
}

import type { LegendColorValue } from './types';

const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

export function parseHexColor(color: string): LegendColorValue | null {
  const match = color.trim().match(HEX_COLOR_PATTERN);
  if (!match) {
    return null;
  }

  const hexValue = match[1];

  return {
    r: parseInt(hexValue.slice(0, 2), 16),
    g: parseInt(hexValue.slice(2, 4), 16),
    b: parseInt(hexValue.slice(4, 6), 16),
    alpha: 1,
  };
}

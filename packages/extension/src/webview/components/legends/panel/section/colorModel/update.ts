import { clampAlpha } from './channels';
import { parseHexColor } from './hex';
import type { LegendColorValue } from './types';

export function withLegendHexColor(color: LegendColorValue, hexColor: string): LegendColorValue {
  const parsedHex = parseHexColor(hexColor);
  if (!parsedHex) {
    return color;
  }

  return {
    ...parsedHex,
    alpha: color.alpha,
  };
}

export function withLegendAlpha(color: LegendColorValue, alpha: number): LegendColorValue {
  return {
    ...color,
    alpha: clampAlpha(alpha),
  };
}

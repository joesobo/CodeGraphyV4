import { clampChannel, formatHexChannel } from './channels';
import type { LegendColorValue } from './types';

export function toLegendColorHex(color: LegendColorValue): string {
  return `#${formatHexChannel(color.r)}${formatHexChannel(color.g)}${formatHexChannel(color.b)}`;
}

export function formatLegendColor(color: LegendColorValue): string {
  if (color.alpha >= 1) {
    return toLegendColorHex(color);
  }

  const alpha = Number(color.alpha.toFixed(2)).toString();
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${alpha})`;
}

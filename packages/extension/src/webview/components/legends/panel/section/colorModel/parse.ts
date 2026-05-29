import { parseHexColor } from './hex';
import { parseRgbColor } from './rgb';
import { createDefaultLegendColor, type LegendColorValue } from './types';

export function parseLegendColor(color: string): LegendColorValue {
  return parseHexColor(color) ?? parseRgbColor(color) ?? createDefaultLegendColor();
}

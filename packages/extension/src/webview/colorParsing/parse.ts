import { parseHexColor } from './hex';
import { parseRgbColor } from './rgb';
import type { ParsedColor } from './types';

export function parseColor(color: string): ParsedColor | null {
  return parseHexColor(color) ?? parseRgbColor(color);
}

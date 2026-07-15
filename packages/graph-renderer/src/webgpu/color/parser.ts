import { cachedColor } from './cache';
import { parseFullHexColor, parseShortHexColor } from './hex';
import { parseRgbColor } from './rgb';
import { parseSrgbColor } from './srgb';
import type { WebGpuColor } from './types';

export function parseWebGpuColor(color: string): WebGpuColor {
  const value = color.trim();
  if (value.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  return parseShortHexColor(value)
    ?? parseFullHexColor(value)
    ?? parseRgbColor(value)
    ?? parseSrgbColor(value)
    ?? [0, 0, 0, 1];
}

export function cachedWebGpuColor(color: string): WebGpuColor {
  return cachedColor(color, parseWebGpuColor);
}

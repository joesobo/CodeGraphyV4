import { parseAlphaValue } from './rgb/alpha';
import { parseRgbChannel } from './rgb/channels';
import { splitColorFunction } from './rgb/function';
import type { LegendColorValue } from './types';

export function parseRgbColor(color: string): LegendColorValue | null {
  const parts = splitColorFunction(color);
  if (!parts || parts.length > 4) {
    return null;
  }

  const [red, green, blue, alpha] = parts;
  const redChannel = parseRgbChannel(red);
  const greenChannel = parseRgbChannel(green);
  const blueChannel = parseRgbChannel(blue);
  if (redChannel === null || greenChannel === null || blueChannel === null) {
    return null;
  }

  const parsedAlpha = parseAlphaValue(alpha);
  if (parsedAlpha === null) {
    return null;
  }

  return {
    r: redChannel,
    g: greenChannel,
    b: blueChannel,
    alpha: parsedAlpha,
  };
}

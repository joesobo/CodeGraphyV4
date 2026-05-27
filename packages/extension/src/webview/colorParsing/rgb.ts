import { parseCssColorFunction } from './functions';
import type { ParsedColor } from './types';

function parseRgbChannel(channel: string): number | null {
  if (!/^\d+$/.test(channel)) {
    return null;
  }

  return Number.parseInt(channel, 10);
}

export function parseRgbColor(color: string): ParsedColor | null {
  const parsed = parseCssColorFunction(color);
  if (!parsed || (parsed.name !== 'rgb' && parsed.name !== 'rgba') || parsed.args.length < 3) {
    return null;
  }

  const r = parseRgbChannel(parsed.args[0]);
  const g = parseRgbChannel(parsed.args[1]);
  const b = parseRgbChannel(parsed.args[2]);
  if (r === null || g === null || b === null) {
    return null;
  }

  return { r, g, b };
}

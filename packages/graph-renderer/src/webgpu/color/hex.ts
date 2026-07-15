import type { WebGpuColor } from './types';

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16) / 255;
}

export function parseShortHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1] + match[1]),
    parseHexChannel(match[2] + match[2]),
    parseHexChannel(match[3] + match[3]),
    match[4] ? parseHexChannel(match[4] + match[4]) : 1,
  ];
}

export function parseFullHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1]),
    parseHexChannel(match[2]),
    parseHexChannel(match[3]),
    match[4] ? parseHexChannel(match[4]) : 1,
  ];
}

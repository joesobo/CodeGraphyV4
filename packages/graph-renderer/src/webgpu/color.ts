type WebGpuColor = [number, number, number, number];

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16) / 255;
}

function parseShortHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1] + match[1]),
    parseHexChannel(match[2] + match[2]),
    parseHexChannel(match[3] + match[3]),
    match[4] ? parseHexChannel(match[4] + match[4]) : 1,
  ];
}

function parseFullHexColor(value: string): WebGpuColor | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (!match) return null;
  return [
    parseHexChannel(match[1]),
    parseHexChannel(match[2]),
    parseHexChannel(match[3]),
    match[4] ? parseHexChannel(match[4]) : 1,
  ];
}

function parseRgbColor(value: string): WebGpuColor | null {
  const match = /^rgba?\(\s*(\d+(?:\.\d+)?|\.\d+)[, ]+(\d+(?:\.\d+)?|\.\d+)[, ]+(\d+(?:\.\d+)?|\.\d+)(?:\s*[,/]\s*(\d+(?:\.\d+)?|\.\d+))?\s*\)$/i.exec(value);
  if (!match) return null;
  return [
    Math.min(255, Number(match[1])) / 255,
    Math.min(255, Number(match[2])) / 255,
    Math.min(255, Number(match[3])) / 255,
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}

function parseSrgbColor(value: string): WebGpuColor | null {
  const match = /^color\(\s*srgb\s+(\d+(?:\.\d+)?|\.\d+)\s+(\d+(?:\.\d+)?|\.\d+)\s+(\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*(\d+(?:\.\d+)?|\.\d+))?\s*\)$/i.exec(value);
  if (!match) return null;
  return [
    Math.min(1, Number(match[1])),
    Math.min(1, Number(match[2])),
    Math.min(1, Number(match[3])),
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}

export function parseWebGpuColor(color: string): WebGpuColor {
  const value = color.trim();
  if (value.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  return parseShortHexColor(value)
    ?? parseFullHexColor(value)
    ?? parseRgbColor(value)
    ?? parseSrgbColor(value)
    ?? [0, 0, 0, 1];
}

const colorCache = new Map<string, WebGpuColor>();
const MAX_CACHED_COLORS = 1_024;

export function cachedWebGpuColor(color: string): WebGpuColor {
  const cached = colorCache.get(color);
  if (cached) return cached;
  const parsed = parseWebGpuColor(color);
  if (colorCache.size >= MAX_CACHED_COLORS) colorCache.clear();
  colorCache.set(color, parsed);
  return parsed;
}

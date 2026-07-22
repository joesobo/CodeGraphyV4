import type { WebGpuColor } from './types';

const MAX_CACHED_COLORS = 1_024;
const colorCache = new Map<string, WebGpuColor>();

export function cachedColor(
  color: string,
  parse: (value: string) => WebGpuColor,
): WebGpuColor {
  const cached = colorCache.get(color);
  if (cached) return cached;
  const parsed = parse(color);
  if (colorCache.size >= MAX_CACHED_COLORS) colorCache.clear();
  colorCache.set(color, parsed);
  return parsed;
}

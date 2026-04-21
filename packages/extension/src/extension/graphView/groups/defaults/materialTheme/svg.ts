import { Buffer } from 'node:buffer';
import { DEFAULT_MATERIAL_COLOR } from './model';

const COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;

export function extractPrimaryColor(svg: string): string {
  const matches = svg.match(COLOR_PATTERN) ?? [];
  if (matches.length === 0) {
    return DEFAULT_MATERIAL_COLOR;
  }

  const counts = new Map<string, number>();
  let bestColor = DEFAULT_MATERIAL_COLOR;
  let bestCount = 0;

  for (const match of matches) {
    const normalized = normalizeHexColor(match);
    const nextCount = (counts.get(normalized) ?? 0) + 1;
    counts.set(normalized, nextCount);
    if (nextCount > bestCount) {
      bestColor = normalized;
      bestCount = nextCount;
    }
  }

  return bestColor;
}

export function toWhiteSvgDataUrl(svg: string): string {
  const whiteSvg = svg.replace(COLOR_PATTERN, '#FFFFFF');
  return toSvgDataUrl(whiteSvg);
}

export function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function normalizeHexColor(value: string): string {
  if (value.length === 4) {
    const [, red, green, blue] = value;
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  return value.slice(0, 7).toUpperCase();
}

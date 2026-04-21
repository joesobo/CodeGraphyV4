import { Buffer } from 'node:buffer';
import { DEFAULT_MATERIAL_COLOR } from './model';

const COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;

export function extractPrimaryColor(svg: string): string {
  const [match] = svg.match(COLOR_PATTERN) ?? [];
  return match ?? DEFAULT_MATERIAL_COLOR;
}

export function toWhiteSvgDataUrl(svg: string): string {
  const whiteSvg = svg.replace(COLOR_PATTERN, '#FFFFFF');
  return `data:image/svg+xml;base64,${Buffer.from(whiteSvg, 'utf8').toString('base64')}`;
}

import type { NodeShape2D } from '../../shared/types';
import { svgRegularPolygonPath } from './svgRegularPolygonPath';
import { svgStarPath } from './svgStarPath';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function svgShapePath(shape: NodeShape2D | undefined, x: number, y: number, size: number): string {
  switch (shape) {
    case 'square':
      return `M${x - size},${y - size}h${size * 2}v${size * 2}h${-size * 2}Z`;
    case 'diamond':
      return `M${x},${y - size}L${x + size},${y}L${x},${y + size}L${x - size},${y}Z`;
    case 'triangle':
      return svgRegularPolygonPath(x, y, size, 3);
    case 'hexagon':
      return svgRegularPolygonPath(x, y, size, 6);
    case 'star':
      return svgStarPath(x, y, size);
    default:
      return '';
  }
}

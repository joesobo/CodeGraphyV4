import { svgRegularPolygonPath } from './regularPolygon/path';
import { svgStarPath } from './starPath';
import type { NodeShape2D } from '../../../../shared/settings/modes';
import type { RectangularNodeArea2D } from '../../../components/graph/model/node/rectangularArea';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function svgShapePath(
  shape: NodeShape2D | undefined,
  x: number,
  y: number,
  size: number,
  shapeSize?: RectangularNodeArea2D,
): string {
  switch (shape) {
    case 'square':
      return `M${x - size},${y - size}h${size * 2}v${size * 2}h${-size * 2}Z`;
    case 'rectangle': {
      const width = shapeSize?.width ?? size * 2;
      const height = shapeSize?.height ?? size * 2;
      return `M${x - (width / 2)},${y - (height / 2)}h${width}v${height}h${-width}Z`;
    }
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

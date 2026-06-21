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

type SvgShapePathBuilder = (
  x: number,
  y: number,
  size: number,
  shapeSize?: RectangularNodeArea2D,
) => string;

const SVG_SHAPE_PATH_BUILDERS: Partial<Record<NodeShape2D, SvgShapePathBuilder>> = {
  square: (x, y, size) => `M${x - size},${y - size}h${size * 2}v${size * 2}h${-size * 2}Z`,
  rectangle: (x, y, size, shapeSize) => {
    const width = shapeSize?.width ?? size * 2;
    const height = shapeSize?.height ?? size * 2;
    return `M${x - (width / 2)},${y - (height / 2)}h${width}v${height}h${-width}Z`;
  },
  diamond: (x, y, size) => `M${x},${y - size}L${x + size},${y}L${x},${y + size}L${x - size},${y}Z`,
  triangle: (x, y, size) => svgRegularPolygonPath(x, y, size, 3),
  hexagon: (x, y, size) => svgRegularPolygonPath(x, y, size, 6),
  star: (x, y, size) => svgStarPath(x, y, size),
};

export function svgShapePath(
  shape: NodeShape2D | undefined,
  x: number,
  y: number,
  size: number,
  shapeSize?: RectangularNodeArea2D,
): string {
  return shape ? SVG_SHAPE_PATH_BUILDERS[shape]?.(x, y, size, shapeSize) ?? '' : '';
}

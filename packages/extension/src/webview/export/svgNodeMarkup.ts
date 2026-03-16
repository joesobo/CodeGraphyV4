import type { NodeShape2D } from '../../shared/types';
import { escapeXml, svgShapePath } from './svgShapes';
import type { SvgExportNode, SvgPosition } from './svgTypes';

export function buildNodeShapeElement(
  node: SvgExportNode,
  position: SvgPosition,
  shape: NodeShape2D
): string {
  if (shape === 'circle') {
    return `<circle cx="${position.x}" cy="${position.y}" r="${node.size}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`;
  }

  return `<path d="${svgShapePath(shape, position.x, position.y, node.size)}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`;
}

export function buildNodeLabelElement(
  node: SvgExportNode,
  position: SvgPosition,
  labelColor: string
): string {
  return `<text x="${position.x}" y="${position.y + node.size + 14}" text-anchor="middle" fill="${labelColor}" font-size="12" font-family="sans-serif">${escapeXml(node.label)}</text>`;
}

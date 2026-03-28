import { appendNodeImageOverlay } from './svgNodeImageOverlay';
import { buildNodeLabelElement, buildNodeShapeElement } from './svgNodeMarkup';
import type { SvgExportNode, SvgPosition } from './svgTypes';

export function appendNodeElements(
  parts: string[],
  definitions: string[],
  imageElements: string[],
  nodes: SvgExportNode[],
  positionMap: Map<string, SvgPosition>,
  showLabels: boolean,
  labelColor: string
): void {
  for (const node of nodes) {
    const position = positionMap.get(node.id);
    if (!position) {
      continue;
    }

    const shape = node.shape2D ?? 'circle';
    parts.push(buildNodeShapeElement(node, position, shape));
    appendNodeImageOverlay(node, position, shape, definitions, imageElements);

    if (showLabels) {
      parts.push(buildNodeLabelElement(node, position, labelColor));
    }
  }
}

import type { NodeShape2D } from '../../../shared/types';
import { getImage } from '../imageCache';
import { escapeXml, svgShapePath } from './exportSvgShapes';
import type { SvgExportNode, SvgPosition } from './exportSvgTypes';

function appendNodeShape(parts: string[], node: SvgExportNode, position: SvgPosition, shape: NodeShape2D): void {
  if (shape === 'circle') {
    parts.push(
      `<circle cx="${position.x}" cy="${position.y}" r="${node.size}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`
    );
    return;
  }

  parts.push(
    `<path d="${svgShapePath(shape, position.x, position.y, node.size)}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`
  );
}

function appendNodeImageOverlay(
  node: SvgExportNode,
  position: SvgPosition,
  shape: NodeShape2D,
  definitions: string[],
  imageElements: string[]
): void {
  if (!node.imageUrl) {
    return;
  }

  const image = getImage(node.imageUrl);
  if (!image) {
    return;
  }

  const clipId = `clip-${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const imageSize = node.size * 1.2;
  const clipShape =
    shape === 'circle'
      ? `<circle cx="${position.x}" cy="${position.y}" r="${node.size * 0.8}"/>`
      : `<path d="${svgShapePath(shape, position.x, position.y, node.size * 0.8)}"/>`;

  definitions.push(`<clipPath id="${clipId}">${clipShape}</clipPath>`);

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || 64;
  canvas.height = image.naturalHeight || 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.drawImage(image, 0, 0);
  const dataUri = canvas.toDataURL('image/png');
  imageElements.push(
    `<image href="${dataUri}" x="${position.x - imageSize / 2}" y="${position.y - imageSize / 2}" width="${imageSize}" height="${imageSize}" clip-path="url(#${clipId})"/>`
  );
}

function appendNodeLabel(parts: string[], node: SvgExportNode, position: SvgPosition, labelColor: string): void {
  parts.push(
    `<text x="${position.x}" y="${position.y + node.size + 14}" text-anchor="middle" fill="${labelColor}" font-size="12" font-family="sans-serif">${escapeXml(node.label)}</text>`
  );
}

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
    appendNodeShape(parts, node, position, shape);
    appendNodeImageOverlay(node, position, shape, definitions, imageElements);

    if (showLabels) {
      appendNodeLabel(parts, node, position, labelColor);
    }
  }
}

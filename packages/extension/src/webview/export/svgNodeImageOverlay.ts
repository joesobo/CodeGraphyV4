import type { NodeShape2D } from '../../shared/contracts';
import { getImage } from '../components/graph/rendering/imageCache';
import { svgShapePath } from './svgShapes';
import type { SvgExportNode, SvgPosition } from './svgTypes';

function buildClipShape(node: SvgExportNode, position: SvgPosition, shape: NodeShape2D): string {
  if (shape === 'circle') {
    return `<circle cx="${position.x}" cy="${position.y}" r="${node.size * 0.8}"/>`;
  }

  return `<path d="${svgShapePath(shape, position.x, position.y, node.size * 0.8)}"/>`;
}

export function appendNodeImageOverlay(
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
  definitions.push(`<clipPath id="${clipId}">${buildClipShape(node, position, shape)}</clipPath>`);

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

import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import { getImage } from '../imageCache';
import { drawShape } from '../shapes/draw/twoDimensional';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import {
  getNodeType,
  type FGNode,
} from '../../model/build';

export function renderNodeImageOverlay(
  ctx: CanvasRenderingContext2D,
  node: FGNode,
  triggerImageRerender: (this: void) => void,
): void {
  if (!node.imageUrl) {
    return;
  }

  const image = getImage(node.imageUrl, triggerImageRerender);
  if (!image) {
    return;
  }

  ctx.save();
  if (node.nodeType !== 'folder') {
    drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size * 0.8);
    ctx.clip();
  }
  const imageSize = node.nodeType === 'folder' ? node.size * 2 : node.size * 1.2;
  ctx.drawImage(image, node.x! - imageSize / 2, node.y! - imageSize / 2, imageSize, imageSize);
  ctx.restore();
}

export function renderNodePluginOverlay(
  pluginHost: WebviewPluginHost | undefined,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  decoration: NodeDecorationPayload | undefined,
): void {
  if (!pluginHost) {
    return;
  }

  const renderer = pluginHost.getNodeRenderer(getNodeType(node.id))
    ?? pluginHost.getNodeRenderer('*');
  if (!renderer) {
    return;
  }

  try {
    renderer({
      node,
      ctx,
      globalScale,
      decoration,
    });
  } catch (error) {
    console.error('[CodeGraphy] Plugin node renderer error:', error);
  }
}

import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { FGNode } from '../../model/build';

export function renderNodeDecorationBadge(
  ctx: CanvasRenderingContext2D,
  node: FGNode,
  decoration: NodeDecorationPayload | undefined,
  globalScale: number,
): void {
  const badge = decoration?.badge;
  if (!badge?.text) return;

  const fontSize = 10 / globalScale;
  const padding = 3 / globalScale;
  ctx.font = `600 ${fontSize}px sans-serif`;
  const width = ctx.measureText(badge.text).width + padding * 2;
  const height = fontSize + padding * 2;
  const offset = node.size * 0.72;
  const left = badge.position?.includes('left')
    ? (node.x ?? 0) - offset - width
    : (node.x ?? 0) + offset;
  const top = badge.position?.startsWith('bottom')
    ? (node.y ?? 0) + offset
    : (node.y ?? 0) - offset - height;

  ctx.fillStyle = badge.bgColor ?? '#f14c4c';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = badge.color ?? '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.text, left + width / 2, top + height / 2);
}

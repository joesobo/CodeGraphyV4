import { mdiPin } from '@mdi/js';
import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';

const MATERIAL_ICON_VIEWBOX_SIZE = 24;
let pinIconPath: Path2D | undefined;

function getPinIconPath(): Path2D {
  pinIconPath ??= new Path2D(mdiPin);
  return pinIconPath;
}

export interface RenderNodePinBadgeOptions {
  appearance: Pick<GraphAppearance, 'nodeSelectionBorder'>;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  node: FGNode;
}

export function renderNodePinBadge({
  appearance,
  ctx,
  globalScale,
  node,
}: RenderNodePinBadgeOptions): void {
  if (!node.isPinned || node.x === undefined || node.y === undefined) {
    return;
  }

  const radius = Math.max(7 / globalScale, node.size * 0.18);
  const centerX = node.x + node.size * 0.7;
  const centerY = node.y - node.size * 0.7;
  const iconSize = radius * 1.55;
  const iconScale = iconSize / MATERIAL_ICON_VIEWBOX_SIZE;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = appearance.nodeSelectionBorder;
  ctx.fill();
  ctx.strokeStyle = node.borderColor;
  ctx.lineWidth = Math.max(1, 1.25 / globalScale);
  ctx.stroke();

  ctx.translate(centerX - iconSize / 2, centerY - iconSize / 2);
  ctx.scale(iconScale, iconScale);
  ctx.fillStyle = node.color;
  ctx.fill(getPinIconPath());
  ctx.restore();
}

import { mdiPin } from '@mdi/js';
import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';

const MATERIAL_ICON_VIEWBOX_SIZE = 24;
const PIN_BADGE_HIDDEN_NODE_RADIUS_PX = 5;
const PIN_BADGE_FULL_OPACITY_NODE_RADIUS_PX = 9;
let pinIconPath: Path2D | undefined;

function getPinIconPath(): Path2D {
  pinIconPath ??= new Path2D(mdiPin);
  return pinIconPath;
}

function getPinnedNodeBadgeOpacity(node: FGNode, globalScale: number): number {
  const nodeRadiusPx = node.size * globalScale;
  const fadeDistance = PIN_BADGE_FULL_OPACITY_NODE_RADIUS_PX - PIN_BADGE_HIDDEN_NODE_RADIUS_PX;

  return Math.min(
    1,
    Math.max(0, (nodeRadiusPx - PIN_BADGE_HIDDEN_NODE_RADIUS_PX) / fadeDistance),
  );
}

export interface RenderNodePinBadgeOptions {
  appearance: Pick<GraphAppearance, 'labelForeground'>;
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

  const badgeOpacity = getPinnedNodeBadgeOpacity(node, globalScale);
  if (badgeOpacity <= 0.01) {
    return;
  }

  const radius = Math.max(7 / globalScale, node.size * 0.18);
  const centerX = node.x + node.size * 0.7;
  const centerY = node.y - node.size * 0.7;
  const iconSize = radius * 1.55;
  const iconScale = iconSize / MATERIAL_ICON_VIEWBOX_SIZE;

  ctx.save();
  ctx.globalAlpha *= badgeOpacity;
  ctx.translate(centerX - iconSize / 2, centerY - iconSize / 2);
  ctx.scale(iconScale, iconScale);
  ctx.fillStyle = appearance.labelForeground;
  ctx.fill(getPinIconPath());
  ctx.restore();
}

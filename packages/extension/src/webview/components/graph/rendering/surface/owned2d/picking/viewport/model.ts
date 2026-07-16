import type { FGNode } from '../../../../../model/build';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import { resolveViewportNodePin } from './pin';

function updateNodeKinematics(
  layout: OwnedGraphLayout,
  index: number,
  node: FGNode,
): void {
  const { x, y, vx, vy } = layout.engine;
  if (Number.isFinite(node.x)) x[index] = node.x as number;
  if (Number.isFinite(node.y)) y[index] = node.y as number;
  if (Number.isFinite(node.fx)) x[index] = node.fx as number;
  if (Number.isFinite(node.fy)) y[index] = node.fy as number;
  if (Number.isFinite(node.vx)) vx[index] = node.vx as number;
  if (Number.isFinite(node.vy)) vy[index] = node.vy as number;
  layout.engine.setKinematics(x, y, vx, vy);
}

export function updateOwnedGraphViewportNode(
  layout: OwnedGraphLayout | null,
  nodeId: string,
  updates: Record<string, unknown>,
): boolean {
  const index = layout?.engine.getNodeIndex(nodeId);
  if (!layout || index === undefined) return false;
  const node = layout.nodes[index];
  Object.assign(node, updates);
  const pinIntent = resolveViewportNodePin(node, updates);
  updateNodeKinematics(layout, index, node);
  if (pinIntent === 'pin') layout.engine.pin(index);
  if (pinIntent === 'release') layout.engine.release(index);
  layout.engine.reheat();
  return true;
}

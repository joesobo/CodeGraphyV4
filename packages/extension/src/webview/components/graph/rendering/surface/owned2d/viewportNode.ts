import type { FGNode } from '../../../model/build';
import type { OwnedGraphLayout } from './layout';

type PinIntent = 'pin' | 'release' | 'unchanged';

function hasPinnedPosition(node: FGNode): boolean {
  return node.isDragging === true
    || Number.isFinite(node.fx)
    || Number.isFinite(node.fy);
}

function updatesPinState(updates: Record<string, unknown>): boolean {
  return 'isPinned' in updates
    || 'isDragging' in updates
    || 'fx' in updates
    || 'fy' in updates;
}

function resolvePinIntent(node: FGNode, updates: Record<string, unknown>): PinIntent {
  const explicitlyUnpinned = updates.isPinned === false;
  if (explicitlyUnpinned) {
    node.fx = undefined;
    node.fy = undefined;
  }
  if (updates.isPinned === true) return 'pin';
  if (!explicitlyUnpinned && hasPinnedPosition(node)) return 'pin';
  return updatesPinState(updates) ? 'release' : 'unchanged';
}

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

function applyPinIntent(layout: OwnedGraphLayout, index: number, intent: PinIntent): void {
  if (intent === 'pin') layout.engine.pin(index);
  if (intent === 'release') layout.engine.release(index);
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
  const pinIntent = resolvePinIntent(node, updates);
  updateNodeKinematics(layout, index, node);
  applyPinIntent(layout, index, pinIntent);
  layout.engine.reheat();
  return true;
}

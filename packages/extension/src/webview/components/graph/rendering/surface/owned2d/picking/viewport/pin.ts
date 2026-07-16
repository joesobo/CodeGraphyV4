import type { FGNode } from '../../../../../model/build';

export type ViewportNodePinIntent = 'pin' | 'release' | 'unchanged';

function hasPinnedPosition(node: FGNode): boolean {
  return node.isDragging === true || Number.isFinite(node.fx) || Number.isFinite(node.fy);
}

function updatesPinState(updates: Record<string, unknown>): boolean {
  return 'isPinned' in updates || 'isDragging' in updates || 'fx' in updates || 'fy' in updates;
}

export function resolveViewportNodePin(
  node: FGNode,
  updates: Record<string, unknown>,
): ViewportNodePinIntent {
  const explicitlyUnpinned = updates.isPinned === false;
  if (explicitlyUnpinned) {
    node.fx = undefined;
    node.fy = undefined;
  }
  if (updates.isPinned === true) return 'pin';
  if (!explicitlyUnpinned && hasPinnedPosition(node)) return 'pin';
  return updatesPinState(updates) ? 'release' : 'unchanged';
}

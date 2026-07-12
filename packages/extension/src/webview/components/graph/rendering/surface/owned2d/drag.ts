import type { OwnedGraphLayout } from './layout';

export function synchronizeOwnedDraggedNodes(
  layout: OwnedGraphLayout,
  draggedIndexes: Set<number>,
): void {
  for (let index = 0; index < layout.nodes.length; index += 1) {
    const node = layout.nodes[index];
    if (node.isDragging !== true) continue;
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    layout.engine.setNodePosition(index, node.x as number, node.y as number);
    layout.engine.pin(index);
    draggedIndexes.add(index);
  }
}

export function releaseOwnedDraggedNodes(
  layout: OwnedGraphLayout,
  draggedIndexes: ReadonlySet<number>,
): void {
  for (const index of draggedIndexes) {
    const node = layout.nodes[index];
    if (!node || node.isPinned === true) continue;
    node.fx = undefined;
    node.fy = undefined;
    layout.engine.release(index);
  }
}

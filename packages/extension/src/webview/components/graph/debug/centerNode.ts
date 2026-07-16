import type { GraphDebugControls } from './contracts/protocol';
import type { DebugNode } from './snapshot';

function finitePosition(node: DebugNode | undefined): node is DebugNode & { x: number; y: number } {
  return typeof node?.x === 'number' && Number.isFinite(node.x)
    && typeof node.y === 'number' && Number.isFinite(node.y);
}

export function centerGraphDebugNode(nodeId: string, scale: number, nodes: DebugNode[], graph: GraphDebugControls | undefined): boolean {
  const node = nodes.find(entry => entry.id === nodeId);
  if (!finitePosition(node) || !graph?.centerAt || !graph.zoom || !Number.isFinite(scale)) return false;
  graph.zoom(scale, 0);
  graph.centerAt(node.x, node.y, 0);
  return true;
}

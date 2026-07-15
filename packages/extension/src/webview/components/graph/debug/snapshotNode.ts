import type { GraphDebugControls, GraphDebugSnapshot } from './contracts/protocol';
import type { DebugNode } from './snapshot';
import { ownedNodeCollisionRadius } from '../rendering/surface/owned2d/collisionRadius';

function optionalNodeProperties(node: DebugNode) {
  return {
    ...(typeof node.baseOpacity === 'number' ? { baseOpacity: node.baseOpacity } : {}),
    ...(typeof node.color === 'string' ? { color: node.color } : {}),
    ...(typeof node.imageUrl === 'string' ? { imageUrl: node.imageUrl } : {}),
    ...(node.shapeSize2D ? { shapeSize2D: node.shapeSize2D } : {}),
  };
}

export function buildDebugNodeSnapshot(node: DebugNode, graph: GraphDebugControls | undefined): GraphDebugSnapshot['nodes'][number] {
  const x = node.x ?? 0; const y = node.y ?? 0;
  const screen = graph?.graph2ScreenCoords?.(x, y) ?? { x, y };
  return { ...optionalNodeProperties(node), collisionRadius: ownedNodeCollisionRadius(node), id: node.id,
    positionFinite: typeof node.x === 'number' && Number.isFinite(node.x)
      && typeof node.y === 'number' && Number.isFinite(node.y),
    screenX: screen.x, screenY: screen.y, size: node.size, x, y };
}

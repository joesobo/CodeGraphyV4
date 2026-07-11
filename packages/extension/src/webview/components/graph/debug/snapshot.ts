import type { RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './contracts/protocol';
import { getGraphCollisionRadius } from '../runtime/physics/root/collision';

export interface DebugNode {
  baseOpacity?: number;
  collisionRadius2D?: number;
  color?: string;
  id: string;
  imageUrl?: string;
  shapeSize2D?: {
    height: number;
    width: number;
  };
  size: number;
  x?: number;
  y?: number;
  z?: number;
}

function getContainerSize(containerRef: RefObject<HTMLElement | null>): {
  containerHeight: number;
  containerWidth: number;
} {
  const containerRect = containerRef.current?.getBoundingClientRect();

  return {
    containerHeight: containerRect?.height ?? 0,
    containerWidth: containerRect?.width ?? 0,
  };
}

function buildDebugNodeSnapshot(
  node: DebugNode,
  graph: GraphDebugControls | undefined,
): GraphDebugSnapshot['nodes'][number] {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const z = typeof node.z === 'number' ? node.z : 0;
  const screen = graph?.graph2ScreenCoords?.(x, y, z) ?? { x, y };

  return {
    ...(typeof node.baseOpacity === 'number' ? { baseOpacity: node.baseOpacity } : {}),
    collisionRadius: getGraphCollisionRadius(node),
    ...(typeof node.color === 'string' ? { color: node.color } : {}),
    id: node.id,
    ...(typeof node.imageUrl === 'string' ? { imageUrl: node.imageUrl } : {}),
    positionFinite: typeof node.x === 'number'
      && Number.isFinite(node.x)
      && typeof node.y === 'number'
      && Number.isFinite(node.y),
    screenX: screen.x,
    ...(node.shapeSize2D ? { shapeSize2D: node.shapeSize2D } : {}),
    screenY: screen.y,
    size: node.size,
    x,
    y,
  };
}

export function buildGraphDebugSnapshot({
  containerRef,
  graph,
  graphMode,
  nodes,
}: {
  containerRef: RefObject<HTMLElement | null>;
  graph: GraphDebugControls | undefined;
  graphMode: '2d' | '3d';
  nodes: DebugNode[];
}): GraphDebugSnapshot {
  return {
    ...getContainerSize(containerRef),
    graphMode,
    nodes: nodes.map((node) => buildDebugNodeSnapshot(node, graph)),
    zoom: graphMode === '2d' ? (graph?.zoom?.() ?? null) : null,
  };
}

import type { RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './contracts/protocol';

export interface DebugNode {
  baseOpacity?: number;
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
  const screen = graph?.graph2ScreenCoords?.(x, y) ?? { x, y };

  return {
    ...(typeof node.baseOpacity === 'number' ? { baseOpacity: node.baseOpacity } : {}),
    ...(typeof node.color === 'string' ? { color: node.color } : {}),
    id: node.id,
    ...(typeof node.imageUrl === 'string' ? { imageUrl: node.imageUrl } : {}),
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
  graphMode: '2d';
  nodes: DebugNode[];
}): GraphDebugSnapshot {
  return {
    ...getContainerSize(containerRef),
    graphMode,
    nodes: nodes.map((node) => buildDebugNodeSnapshot(node, graph)),
    zoom: graph?.zoom?.() ?? null,
  };
}

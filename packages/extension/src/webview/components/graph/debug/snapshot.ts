import type { RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './contracts/protocol';
import { buildDebugNodeSnapshot } from './snapshotNode';

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

export function buildGraphDebugSnapshot({
  containerRef,
  graph,
  nodes,
}: {
  containerRef: RefObject<HTMLElement | null>;
  graph: GraphDebugControls | undefined;
  nodes: DebugNode[];
}): GraphDebugSnapshot {
  return {
    ...getContainerSize(containerRef),
    fps: graph?.getFps?.() ?? null,
    nodes: nodes.map((node) => buildDebugNodeSnapshot(node, graph)),
    zoom: graph?.zoom?.() ?? null,
  };
}

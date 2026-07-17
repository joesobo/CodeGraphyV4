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

function inferCameraCenter(
  nodes: GraphDebugSnapshot['nodes'],
  containerWidth: number,
  containerHeight: number,
  zoom: number | null,
): { cameraCenterX: number | null; cameraCenterY: number | null } {
  const node = nodes.find(candidate => candidate.positionFinite);
  if (!node || zoom === null || !Number.isFinite(zoom) || zoom === 0) {
    return { cameraCenterX: null, cameraCenterY: null };
  }
  return {
    cameraCenterX: node.x - (node.screenX - containerWidth / 2) / zoom,
    cameraCenterY: node.y - (node.screenY - containerHeight / 2) / zoom,
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
  const container = getContainerSize(containerRef);
  const nodeSnapshots = nodes.map((node) => buildDebugNodeSnapshot(node, graph));
  const zoom = graph?.zoom?.() ?? null;
  return {
    ...inferCameraCenter(
      nodeSnapshots,
      container.containerWidth,
      container.containerHeight,
      zoom,
    ),
    ...container,
    fps: graph?.getFps?.() ?? null,
    nodes: nodeSnapshots,
    zoom,
  };
}

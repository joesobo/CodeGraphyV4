import type { RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './types';

export interface DebugNode {
  id: string;
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
    id: node.id,
    screenX: screen.x,
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

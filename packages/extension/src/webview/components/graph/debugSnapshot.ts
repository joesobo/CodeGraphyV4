import type { RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './debugTypes';

export interface DebugNode {
  id: string;
  size: number;
  x?: number;
  y?: number;
  z?: number;
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
  const containerRect = containerRef.current?.getBoundingClientRect();

  return {
    containerHeight: containerRect?.height ?? 0,
    containerWidth: containerRect?.width ?? 0,
    graphMode,
    nodes: nodes.map((node) => {
      const z = typeof node.z === 'number' ? node.z : 0;
      const screen = graph?.graph2ScreenCoords?.(node.x ?? 0, node.y ?? 0, z) ?? {
        x: node.x ?? 0,
        y: node.y ?? 0,
      };

      return {
        id: node.id,
        screenX: screen.x,
        screenY: screen.y,
        size: node.size,
        x: node.x ?? 0,
        y: node.y ?? 0,
      };
    }),
    zoom: graphMode === '2d' ? (graph?.zoom?.() ?? null) : null,
  };
}

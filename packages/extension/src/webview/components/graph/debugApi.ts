import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { GraphDebugControls, GraphDebugSnapshot } from './debug';

interface DebugNode {
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

export function installGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  fg3dRef,
  graphDataRef,
  graphMode,
  win,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  fg3dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  graphMode: '2d' | '3d';
  win: Window;
}): (() => void) | undefined {
  if (win.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ !== true) {
    return undefined;
  }

  win.__CODEGRAPHY_GRAPH_DEBUG__ = {
    fitView,
    fitViewWithPadding: (padding: number) => {
      const graph = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
      graph?.zoomToFit?.(300, padding);
    },
    getSnapshot: () => buildGraphDebugSnapshot({
      containerRef,
      graph: graphMode === '2d' ? fg2dRef.current : fg3dRef.current,
      graphMode,
      nodes: graphDataRef.current.nodes,
    }),
  };

  return () => {
    delete win.__CODEGRAPHY_GRAPH_DEBUG__;
  };
}

export function useGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  fg3dRef,
  graphDataRef,
  graphMode,
  win,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  fg3dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  graphMode: '2d' | '3d';
  win?: Window;
}): void {
  useEffect(() => {
    if (!win) {
      return;
    }

    return installGraphDebugApi({
      containerRef,
      fitView,
      fg2dRef,
      fg3dRef,
      graphDataRef,
      graphMode,
      win,
    });
  }, [containerRef, fg2dRef, fg3dRef, fitView, graphDataRef, graphMode, win]);
}

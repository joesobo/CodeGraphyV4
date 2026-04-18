import type { MutableRefObject, RefObject } from 'react';
import './window';
import type { GraphDebugControls } from './contracts';
import { buildGraphDebugSnapshot, type DebugNode } from './snapshot';

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

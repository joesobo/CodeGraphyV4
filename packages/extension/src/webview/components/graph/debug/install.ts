import type { MutableRefObject, RefObject } from 'react';
import './window';
import type { GraphDebugControls } from './contracts/protocol';
import { buildGraphDebugSnapshot, type DebugNode } from './snapshot';

export function installGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  fg3dRef,
  graphDataRef,
  graphMode,
  openNodeContextMenu,
  win,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  fg3dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  graphMode: '2d' | '3d';
  openNodeContextMenu?(this: void, nodeId: string, event: MouseEvent): void;
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
    openNodeContextMenu: (nodeId: string) => {
      const node = graphDataRef.current.nodes.find(entry => entry.id === nodeId);
      if (!node || !openNodeContextMenu) {
        return;
      }

      const graph = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
      const screen = graph?.graph2ScreenCoords?.(
        node.x ?? 0,
        node.y ?? 0,
        typeof node.z === 'number' ? node.z : 0,
      ) ?? {
        x: node.x ?? 0,
        y: node.y ?? 0,
      };
      const rect = containerRef.current?.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        button: 2,
        buttons: 2,
        cancelable: true,
        clientX: (rect?.left ?? 0) + screen.x,
        clientY: (rect?.top ?? 0) + screen.y,
      });

      openNodeContextMenu(nodeId, event);
    },
  };

  return () => {
    delete win.__CODEGRAPHY_GRAPH_DEBUG__;
  };
}

import type { MutableRefObject, RefObject } from 'react';
import './window';
import type { GraphDebugControls } from './contracts/protocol';
import { buildGraphDebugSnapshot, type DebugNode } from './snapshot';
import { centerGraphDebugNode } from './centerNode';
import { getGraphDebugNodeScreenPosition, openGraphDebugNodeContextMenu } from './contextMenu';

type GraphDebugApiOptions = {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  openNodeContextMenu?(this: void, nodeId: string, event: MouseEvent): void;
  win: Window;
};

export function installGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  graphDataRef,
  openNodeContextMenu,
  win,
}: GraphDebugApiOptions): (() => void) | undefined {
  if (win.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ !== true && win.document?.body?.dataset.codegraphyDebug !== 'true') {
    return undefined;
  }
  win.__CODEGRAPHY_GRAPH_DEBUG__ = {
    centerNode: (nodeId, scale) => centerGraphDebugNode(nodeId, scale, graphDataRef.current.nodes, fg2dRef.current),
    fitView,
    fitViewWithPadding: padding => fg2dRef.current?.zoomToFit?.(300, padding),
    getNodeScreenPosition: nodeId => {
      const node = graphDataRef.current.nodes.find(entry => entry.id === nodeId);
      return node ? getGraphDebugNodeScreenPosition(node, fg2dRef.current) : null;
    },
    getSnapshot: () => buildGraphDebugSnapshot({ containerRef, graph: fg2dRef.current, nodes: graphDataRef.current.nodes }),
    openNodeContextMenu: nodeId => openGraphDebugNodeContextMenu(nodeId, { containerRef, fg2dRef, graphDataRef, openNodeContextMenu }),
  };

  return () => {
    delete win.__CODEGRAPHY_GRAPH_DEBUG__;
  };
}

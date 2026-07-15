import type { MutableRefObject, RefObject } from 'react';
import './window';
import type { GraphDebugControls } from './contracts/protocol';
import { buildGraphDebugSnapshot, type DebugNode } from './snapshot';

type GraphDebugApiOptions = {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  openNodeContextMenu?(this: void, nodeId: string, event: MouseEvent): void;
  win: Window;
};

function getGraphDebugNodeScreenPosition(
  node: DebugNode,
  graph: GraphDebugControls | undefined,
): { x: number; y: number } {
  return graph?.graph2ScreenCoords?.(node.x ?? 0, node.y ?? 0) ?? {
    x: node.x ?? 0,
    y: node.y ?? 0,
  };
}

function createGraphDebugContextMenuEvent(
  screen: { x: number; y: number },
  container: HTMLElement | null,
): MouseEvent {
  const rect = container?.getBoundingClientRect();
  return new MouseEvent('contextmenu', {
    bubbles: true,
    button: 2,
    buttons: 2,
    cancelable: true,
    clientX: (rect?.left ?? 0) + screen.x,
    clientY: (rect?.top ?? 0) + screen.y,
  });
}

function openGraphDebugNodeContextMenu(
  nodeId: string,
  options: GraphDebugApiOptions,
): void {
  const node = options.graphDataRef.current.nodes.find(entry => entry.id === nodeId);
  if (!node || !options.openNodeContextMenu) return;

  const screen = getGraphDebugNodeScreenPosition(node, options.fg2dRef.current);
  const event = createGraphDebugContextMenuEvent(screen, options.containerRef.current);
  options.openNodeContextMenu(nodeId, event);
}

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
  const options = {
    containerRef,
    fitView,
    fg2dRef,
    graphDataRef,
    openNodeContextMenu,
    win,
  };

  win.__CODEGRAPHY_GRAPH_DEBUG__ = {
    centerNode: (nodeId: string, scale: number) => {
      const node = graphDataRef.current.nodes.find(entry => entry.id === nodeId);
      const graph = fg2dRef.current;
      if (!node || !graph?.centerAt || !graph.zoom) return false;
      const { x, y } = node;
      if (typeof x !== 'number'
        || !Number.isFinite(x)
        || typeof y !== 'number'
        || !Number.isFinite(y)
        || !Number.isFinite(scale)) return false;
      graph.zoom(scale, 0);
      graph.centerAt(x, y, 0);
      return true;
    },
    fitView,
    fitViewWithPadding: (padding: number) => {
      fg2dRef.current?.zoomToFit?.(300, padding);
    },
    getNodeScreenPosition: (nodeId: string) => {
      const node = graphDataRef.current.nodes.find(entry => entry.id === nodeId);
      return node
        ? getGraphDebugNodeScreenPosition(node, fg2dRef.current)
        : null;
    },
    getPerformance: () => fg2dRef.current?.getPerformance?.() ?? { status: 'idle' },
    getSnapshot: () => buildGraphDebugSnapshot({
      containerRef,
      graph: fg2dRef.current,
      nodes: graphDataRef.current.nodes,
    }),
    openNodeContextMenu: (nodeId: string) => openGraphDebugNodeContextMenu(nodeId, options),
    startInteractionRecording: recordingOptions => {
      fg2dRef.current?.startInteractionRecording?.(recordingOptions);
    },
    startStageAttributionRecording: () => {
      fg2dRef.current?.startStageAttributionRecording?.();
    },
    stopInteractionRecording: () => fg2dRef.current?.stopInteractionRecording?.() ?? null,
    stopStageAttributionRecording: () =>
      fg2dRef.current?.stopStageAttributionRecording?.() ?? null,
  };

  return () => {
    delete win.__CODEGRAPHY_GRAPH_DEBUG__;
  };
}

import type { MutableRefObject, RefObject } from 'react';
import './window';
import type { GraphDebugControls } from './contracts/protocol';
import { createRenderedFrameRecorder } from './frameTimes';
import { buildGraphDebugSnapshot, type DebugNode } from './snapshot';

type GraphDebugApiOptions = {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  openNodeContextMenu?(this: void, nodeId: string, event: MouseEvent): void;
  win: Window;
};

function getActiveGraphDebugControls(
  options: Pick<GraphDebugApiOptions, 'fg2dRef'>,
): GraphDebugControls | undefined {
  return options.fg2dRef.current;
}

function getGraphDebugNodeScreenPosition(
  node: DebugNode,
  graph: GraphDebugControls | undefined,
): { x: number; y: number } {
  return graph?.graph2ScreenCoords?.(
    node.x ?? 0,
    node.y ?? 0,
    typeof node.z === 'number' ? node.z : 0,
  ) ?? {
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
  if (!node || !options.openNodeContextMenu) {
    return;
  }

  const graph = getActiveGraphDebugControls(options);
  const screen = getGraphDebugNodeScreenPosition(node, graph);
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
  const renderedFrames = createRenderedFrameRecorder();

  win.__CODEGRAPHY_GRAPH_DEBUG__ = {
    clearRenderedFrameTimes: renderedFrames.clear,
    fitView,
    fitViewWithPadding: (padding: number) => {
      getActiveGraphDebugControls(options)?.zoomToFit?.(300, padding);
    },
    getSnapshot: () => buildGraphDebugSnapshot({
      containerRef,
      graph: getActiveGraphDebugControls(options),
      graphMode: '2d',
      nodes: graphDataRef.current.nodes,
    }),
    getNodeScreenPosition: (nodeId: string) => {
      const node = graphDataRef.current.nodes.find(entry => entry.id === nodeId);
      return node
        ? getGraphDebugNodeScreenPosition(node, getActiveGraphDebugControls(options))
        : null;
    },
    getRenderedFrameTimes: renderedFrames.read,
    openNodeContextMenu: (nodeId: string) => openGraphDebugNodeContextMenu(nodeId, options),
    recordRenderedFrame: renderedFrames.record,
  };

  return () => {
    delete win.__CODEGRAPHY_GRAPH_DEBUG__;
  };
}

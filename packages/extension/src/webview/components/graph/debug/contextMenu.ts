import type { MutableRefObject, RefObject } from 'react';
import type { GraphDebugControls } from './contracts/protocol';
import type { DebugNode } from './snapshot';

export function getGraphDebugNodeScreenPosition(node: DebugNode, graph: GraphDebugControls | undefined): { x: number; y: number } {
  return graph?.graph2ScreenCoords?.(node.x ?? 0, node.y ?? 0) ?? { x: node.x ?? 0, y: node.y ?? 0 };
}

export function openGraphDebugNodeContextMenu(nodeId: string, options: {
  containerRef: RefObject<HTMLElement | null>;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  openNodeContextMenu?(nodeId: string, event: MouseEvent): void;
}): void {
  const node = options.graphDataRef.current.nodes.find(entry => entry.id === nodeId);
  if (!node || !options.openNodeContextMenu) return;
  const screen = getGraphDebugNodeScreenPosition(node, options.fg2dRef.current);
  const rect = options.containerRef.current?.getBoundingClientRect();
  options.openNodeContextMenu(nodeId, new MouseEvent('contextmenu', {
    bubbles: true, button: 2, buttons: 2, cancelable: true,
    clientX: (rect?.left ?? 0) + screen.x, clientY: (rect?.top ?? 0) + screen.y,
  }));
}

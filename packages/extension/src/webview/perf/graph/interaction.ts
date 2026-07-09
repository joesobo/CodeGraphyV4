import type { FGNode } from '../../components/graph/model/build';
import { moveNodeByTranslate } from '../../components/graph/runtime/use/interaction/nodeDrag/position';

export const INTERACTION_DRAG_TRANSLATE = { x: 12, y: 8 } as const;
const INTERACTION_ZOOM_FACTOR = 1.1;
const PAN_START = { x: 80, y: 80 } as const;
const PAN_END = { x: 96, y: 92 } as const;

interface ReheatableGraph {
  d3ReheatSimulation?: () => void;
}

export interface DeterministicInteractionBurstOptions {
  container: HTMLDivElement | null;
  graph: ReheatableGraph | undefined;
  graphMode: '2d' | '3d';
  handleNodeDrag: (node: FGNode, translate: { x: number; y: number }) => void;
  handleNodeDragEnd: (node: FGNode) => void;
  nodes: readonly FGNode[];
  zoomGraphView: (factor: number) => void;
}

export interface InteractionBurstResult {
  waitForSettle: boolean;
}

function dispatchPanEvent(
  container: HTMLDivElement,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: { x: number; y: number },
  buttons: number,
): void {
  container.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    ctrlKey: true,
  }));
}

function dispatchDeterministicPan(container: HTMLDivElement | null, graphMode: '2d' | '3d'): void {
  if (!container || graphMode !== '2d') {
    return;
  }

  dispatchPanEvent(container, 'mousedown', PAN_START, 1);
  dispatchPanEvent(container, 'mousemove', PAN_END, 1);
  dispatchPanEvent(container, 'mouseup', PAN_END, 0);
}

function selectDeterministicNode(nodes: readonly FGNode[]): FGNode | undefined {
  return [...nodes].sort((left, right) => {
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  })[0];
}

export function runDeterministicInteractionBurst({
  container,
  graph,
  graphMode,
  handleNodeDrag,
  handleNodeDragEnd,
  nodes,
  zoomGraphView,
}: DeterministicInteractionBurstOptions): InteractionBurstResult {
  dispatchDeterministicPan(container, graphMode);
  zoomGraphView(INTERACTION_ZOOM_FACTOR);

  const node = selectDeterministicNode(nodes);
  if (node) {
    moveNodeByTranslate(node, INTERACTION_DRAG_TRANSLATE);
    handleNodeDrag(node, INTERACTION_DRAG_TRANSLATE);
    handleNodeDragEnd(node);
  }

  if (!node || typeof graph?.d3ReheatSimulation !== 'function') {
    return { waitForSettle: false };
  }

  graph.d3ReheatSimulation();
  return { waitForSettle: true };
}

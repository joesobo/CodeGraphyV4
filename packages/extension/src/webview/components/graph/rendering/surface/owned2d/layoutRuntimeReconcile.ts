import { fitOwnedGraphCamera } from './camera';
import { canvasSize } from './canvasGeometry';
import { releaseOwnedDraggedNodes } from './drag';
import type { OwnedGraphLayout } from './layout';
import type { OwnedGraphLayoutRuntime } from './layoutRuntime';

function draggedNodeIndexes(layout: OwnedGraphLayout): Set<number> {
  return new Set(layout.nodes.flatMap((node, index) => node.isDragging === true ? [index] : []));
}

function finishRemovedPointerNode(runtime: OwnedGraphLayoutRuntime, layout: OwnedGraphLayout): void {
  const session = runtime.pointerSessionRef.current;
  if (session?.moved && session.node) runtime.propsRef.current.sharedProps.onNodeDragEnd(session.node);
  releaseOwnedDraggedNodes(layout, draggedNodeIndexes(layout));
  layout.engine.setAlphaTarget(0);
  runtime.pointerSessionRef.current = null;
}

export function reconcileOwnedPointerSession(runtime: OwnedGraphLayoutRuntime, layout: OwnedGraphLayout): void {
  const session = runtime.pointerSessionRef.current;
  if (session?.nodeId) {
    const index = layout.engine.getNodeIndex(session.nodeId);
    if (index === undefined) { finishRemovedPointerNode(runtime, layout); return; }
    session.index = index;
    session.node = layout.nodes[index];
    session.draggedIndexes = draggedNodeIndexes(layout);
  } else if (session?.link) {
    session.link = layout.links.find(link => link.id === session.link?.id) ?? null;
  }
}

export function fitOwnedInitialCamera(runtime: OwnedGraphLayoutRuntime, nodes: OwnedGraphLayout['nodes']): void {
  const canvas = runtime.canvasRef.current;
  if (!canvas || runtime.hasFittedCameraRef.current) return;
  const size = canvasSize(canvas);
  runtime.hasFittedCameraRef.current = fitOwnedGraphCamera(runtime.cameraRef.current, nodes, size.width, size.height);
}

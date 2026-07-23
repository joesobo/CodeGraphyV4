import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { toPhysicsCoordinate } from '../scale/model';
import { shapePageBounds, type ShapeGeometryHost } from '../shape/geometry';
import {
  isIconShape,
  isLabelShape,
  isNodeShape,
  type NodeShape,
  type ScriptShape,
} from '../shape/model';
import {
  beginDragSession,
  clearDragSession,
  nodeHasNotMoved,
  type DragState,
} from './model';
import { resolveDraggedNode, type DraggedNode } from './resolver';

export interface ScriptPointerEvent {
  name: string;
  shape?: ScriptShape;
  type: string;
}

export interface DragHost extends ShapeGeometryHost {
  drag: DragState;
  getCurrentShapes(): ScriptShape[];
  getEngine(): GraphLayoutEngine | undefined;
  getSelectedShapes(): ScriptShape[];
  prepareEngine(): void;
}

function selectedNode(host: DragHost): NodeShape | undefined {
  const selectedShapes = host.getSelectedShapes();
  return selectedShapes.length === 1 && isNodeShape(selectedShapes[0])
    ? selectedShapes[0]
    : undefined;
}

function pointerNode(host: DragHost, shape: ScriptShape | undefined): NodeShape | undefined {
  if (!shape) return selectedNode(host);
  if (isNodeShape(shape)) return shape;
  if (!isIconShape(shape) && !isLabelShape(shape)) return selectedNode(host);
  return host.getCurrentShapes().find(
    (candidate): candidate is NodeShape => isNodeShape(candidate)
      && candidate.meta.codegraphyEntityId === shape.meta.codegraphyNodeId,
  );
}

function beginEngineDrag(state: DragState, draggedNode: DraggedNode): void {
  if (state.nodeIndex !== undefined) return;
  state.nodeIndex = draggedNode.index;
  draggedNode.engine.pin(draggedNode.index);
  draggedNode.engine.setAlphaTarget(0.3);
}

export function synchronizeDraggedNode(host: DragHost): void {
  const draggedNode = resolveDraggedNode(host);
  if (!draggedNode || nodeHasNotMoved(host.drag, draggedNode.shape)) return;
  beginEngineDrag(host.drag, draggedNode);
  const bounds = shapePageBounds(draggedNode.shape, host);
  draggedNode.engine.setNodePosition(
    draggedNode.index,
    toPhysicsCoordinate(bounds.x + bounds.w / 2),
    toPhysicsCoordinate(bounds.y + bounds.h / 2),
  );
}

function endPointerDrag(host: DragHost): string | undefined {
  const entityId = host.drag.entityId;
  const index = host.drag.nodeIndex;
  const engine = host.getEngine();
  if (index !== undefined && engine) {
    synchronizeDraggedNode(host);
    engine.release(index);
    engine.setAlphaTarget(0);
  }
  clearDragSession(host.drag);
  return entityId;
}

export function handlePointerEvent(
  host: DragHost,
  event: ScriptPointerEvent,
): string | undefined {
  if (event.type !== 'pointer') return undefined;
  if (event.name === 'pointer_down') {
    const node = pointerNode(host, event.shape);
    if (node) beginDragSession(host.drag, node);
  }
  if (event.name === 'pointer_move') synchronizeDraggedNode(host);
  if (event.name === 'pointer_up') return endPointerDrag(host);
  return undefined;
}

import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { toPhysicsCoordinate } from '../scale/model';
import { isNodeShape, type ScriptShape } from '../shape/model';
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

export interface DragHost {
  drag: DragState;
  getCurrentShapes(): ScriptShape[];
  getEngine(): GraphLayoutEngine | undefined;
  prepareEngine(): void;
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
  draggedNode.engine.setNodePosition(
    draggedNode.index,
    toPhysicsCoordinate(draggedNode.shape.x + draggedNode.shape.props.w / 2),
    toPhysicsCoordinate(draggedNode.shape.y + draggedNode.shape.props.h / 2),
  );
}

function endPointerDrag(host: DragHost): void {
  const index = host.drag.nodeIndex;
  const engine = host.getEngine();
  if (index !== undefined && engine) {
    synchronizeDraggedNode(host);
    engine.release(index);
    engine.setAlphaTarget(0);
  }
  clearDragSession(host.drag);
}

export function handlePointerEvent(host: DragHost, event: ScriptPointerEvent): void {
  if (event.type !== 'pointer') return;
  if (event.name === 'pointer_down' && event.shape && isNodeShape(event.shape)) {
    beginDragSession(host.drag, event.shape);
  }
  if (event.name === 'pointer_move') synchronizeDraggedNode(host);
  if (event.name === 'pointer_up') endPointerDrag(host);
}

import type { NodeShape } from '../shape/model';

export interface DragState {
  entityId?: string;
  nodeIndex?: number;
  startPosition?: { x: number; y: number };
}

export function beginDragSession(state: DragState, shape: NodeShape): void {
  state.entityId = shape.meta.codegraphyEntityId;
  state.nodeIndex = undefined;
  state.startPosition = { x: shape.x, y: shape.y };
}

export function clearDragSession(state: DragState): void {
  state.entityId = undefined;
  state.nodeIndex = undefined;
  state.startPosition = undefined;
}

export function nodeHasNotMoved(state: DragState, shape: NodeShape): boolean {
  return state.nodeIndex === undefined
    && shape.x === state.startPosition?.x
    && shape.y === state.startPosition.y;
}

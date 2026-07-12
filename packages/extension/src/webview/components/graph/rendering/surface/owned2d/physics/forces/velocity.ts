import { GraphNodeFlag, type GraphLayoutState } from '../contracts';

export function isNodeHidden(state: GraphLayoutState, index: number): boolean {
  return (state.flags[index] & GraphNodeFlag.Hidden) !== 0;
}

export function isNodePinned(state: GraphLayoutState, index: number): boolean {
  return (state.flags[index] & GraphNodeFlag.Pinned) !== 0;
}

export function applyVelocityPair(
  state: GraphLayoutState,
  first: number,
  second: number,
  forceX: number,
  forceY: number,
): void {
  if (!isNodePinned(state, first)) {
    state.vx[first] += forceX;
    state.vy[first] += forceY;
  }
  if (!isNodePinned(state, second)) {
    state.vx[second] -= forceX;
    state.vy[second] -= forceY;
  }
}

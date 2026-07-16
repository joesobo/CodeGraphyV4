import { GraphNodeFlag } from '../contracts';
import type { GraphEngineState } from '../engine/state';
import { MAX_GRAPH_COORDINATE } from '../validation/input';

function assertNodeIndex(state: GraphEngineState, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= state.graph.x.length) {
    throw new Error(`Graph node index is out of bounds: ${index}`);
  }
}

export function setGraphNodePosition(
  state: GraphEngineState,
  index: number,
  x: number,
  y: number,
): void {
  assertNodeIndex(state, index);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('Graph node position must be finite');
  }
  if (!Number.isFinite(Math.fround(x)) || !Number.isFinite(Math.fround(y))) {
    throw new Error('Graph node position must fit the finite 32-bit float range');
  }
  if (Math.abs(x) > MAX_GRAPH_COORDINATE || Math.abs(y) > MAX_GRAPH_COORDINATE) {
    throw new Error(`Graph node position must have magnitude at most ${MAX_GRAPH_COORDINATE}`);
  }
  state.graph.x[index] = x;
  state.graph.y[index] = y;
  state.graph.vx[index] = 0;
  state.graph.vy[index] = 0;
  state.settled = false;
  state.settledStepCount = 0;
}

export function pinGraphNode(state: GraphEngineState, index: number): void {
  assertNodeIndex(state, index);
  state.graph.flags[index] |= GraphNodeFlag.Pinned;
  state.graph.vx[index] = 0;
  state.graph.vy[index] = 0;
}

export function releaseGraphNode(state: GraphEngineState, index: number): void {
  assertNodeIndex(state, index);
  state.graph.flags[index] &= ~GraphNodeFlag.Pinned;
}

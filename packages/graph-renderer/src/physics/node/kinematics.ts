import type { GraphEngineState } from '../engine/state';
import { MAX_GRAPH_COORDINATE, MAX_GRAPH_VELOCITY } from '../validation/input';

function assertLength(values: Float32Array, nodeCount: number): void {
  if (values.length !== nodeCount) {
    throw new Error('Graph layout kinematics must match node count');
  }
}

function assertDomain(
  values: Float32Array,
  maximumMagnitude: number,
  label: string,
): void {
  if (!values.every(Number.isFinite)) {
    throw new Error('Graph layout kinematics must be finite');
  }
  if (values.some(value => Math.abs(value) > maximumMagnitude)) {
    throw new Error(`Graph layout ${label} must have magnitude at most ${maximumMagnitude}`);
  }
}

export function replaceKinematics(
  state: GraphEngineState,
  x: Float32Array,
  y: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
): void {
  const nodeCount = state.graph.x.length;
  for (const values of [x, y, vx, vy]) assertLength(values, nodeCount);
  assertDomain(x, MAX_GRAPH_COORDINATE, 'x coordinates');
  assertDomain(y, MAX_GRAPH_COORDINATE, 'y coordinates');
  assertDomain(vx, MAX_GRAPH_VELOCITY, 'x velocities');
  assertDomain(vy, MAX_GRAPH_VELOCITY, 'y velocities');
  if (x !== state.graph.x) state.graph.x.set(x);
  if (y !== state.graph.y) state.graph.y.set(y);
  if (vx !== state.graph.vx) state.graph.vx.set(vx);
  if (vy !== state.graph.vy) state.graph.vy.set(vy);
  state.settled = false;
  state.settledStepCount = 0;
}

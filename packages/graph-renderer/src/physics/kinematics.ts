import type { GraphEngineState } from './engineState';

function assertLength(values: Float32Array, nodeCount: number): void {
  if (values.length !== nodeCount) {
    throw new Error('Graph layout kinematics must match node count');
  }
}

function assertFinite(values: Float32Array): void {
  if (!values.every(Number.isFinite)) {
    throw new Error('Graph layout kinematics must be finite');
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
  for (const values of [x, y, vx, vy]) {
    assertLength(values, nodeCount);
    assertFinite(values);
  }
  if (x !== state.graph.x) state.graph.x.set(x);
  if (y !== state.graph.y) state.graph.y.set(y);
  if (vx !== state.graph.vx) state.graph.vx.set(vx);
  if (vy !== state.graph.vy) state.graph.vy.set(vy);
  state.settled = false;
  state.settledStepCount = 0;
}

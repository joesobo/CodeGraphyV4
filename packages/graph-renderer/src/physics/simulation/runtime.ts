import type { GraphLayoutExternalForce, GraphLayoutTickResult } from '../contracts';
import type { GraphEngineState } from '../engine/state';
import { stepSimulation } from './step';

export function tickSimulation(
  state: GraphEngineState,
  externalForce?: GraphLayoutExternalForce,
): GraphLayoutTickResult {
  if (state.graph.x.length === 0) {
    state.settled = true;
    return { moving: false, settled: true, steps: 0 };
  }
  if (state.paused || state.settled) {
    return { moving: false, settled: state.settled, steps: 0 };
  }
  stepSimulation(state, externalForce);
  return { moving: !state.settled, settled: state.settled, steps: 1 };
}

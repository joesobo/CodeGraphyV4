import type { GraphLayoutTickResult } from './contracts';
import type { GraphEngineState } from './engineState';
import { stepSimulation } from './simulationStep';

export function tickSimulation(state: GraphEngineState): GraphLayoutTickResult {
  if (state.graph.x.length === 0) {
    state.settled = true;
    return { moving: false, settled: true, steps: 0 };
  }
  if (state.paused || state.settled) {
    return { moving: false, settled: state.settled, steps: 0 };
  }
  stepSimulation(state);
  return { moving: !state.settled, settled: state.settled, steps: 1 };
}

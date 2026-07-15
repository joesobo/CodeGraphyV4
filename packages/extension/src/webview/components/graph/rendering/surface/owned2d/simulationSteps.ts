import type { GraphLayoutTickResult } from '@codegraphy-dev/graph-renderer';
import {
  FIXED_SIMULATION_STEP_MS,
  MAX_SIMULATION_SUBSTEPS,
  type GraphLayoutFixedTimestepAdvance,
  type GraphLayoutFixedTimestepClock,
} from './simulationClock';
import type { NormalizedSimulationAdvance } from './simulationOptions';
import {
  fixedSimulationBacklogShouldDrop,
  fixedSimulationStepDecision,
  fixedSimulationStepDue,
} from './simulationDecision';
export { normalizeSimulationAdvance } from './simulationOptions';

export function runFixedSimulation(
  clock: GraphLayoutFixedTimestepClock,
  advance: GraphLayoutFixedTimestepAdvance,
  options: NormalizedSimulationAdvance,
): GraphLayoutTickResult {
  const startedAt = options.now();
  let lastStepMs = 0;
  let result = { moving: !advance.currentSettled, settled: advance.currentSettled, steps: 0 };
  let constrained = false;
  while (result.steps < MAX_SIMULATION_SUBSTEPS) {
    const stepDue = fixedSimulationStepDue(clock);
    const decision = fixedSimulationStepDecision(stepDue, result.steps, options, startedAt, lastStepMs);
    if (decision === 'complete') break;
    if (decision === 'constrained') { constrained = true; break; }
    const stepStartedAt = options.now();
    const stepResult = advance.step();
    lastStepMs = Math.max(0, options.now() - stepStartedAt);
    if (stepDue) clock.accumulatorMs = Math.max(0, clock.accumulatorMs - FIXED_SIMULATION_STEP_MS);
    result = { ...stepResult, steps: result.steps + stepResult.steps };
    if (stepResult.steps === 0 || stepResult.settled) break;
  }
  if (fixedSimulationBacklogShouldDrop(clock, constrained, result.steps)) {
    clock.accumulatorMs %= FIXED_SIMULATION_STEP_MS;
  }
  return result;
}

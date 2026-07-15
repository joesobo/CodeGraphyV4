import {
  FIXED_SIMULATION_STEP_MS,
  MAX_SIMULATION_SUBSTEPS,
  type GraphLayoutFixedTimestepClock,
} from './simulationClock';
import type { NormalizedSimulationAdvance } from './simulationOptions';

export function fixedSimulationStepDue(clock: GraphLayoutFixedTimestepClock): boolean {
  return clock.accumulatorMs + 1e-6 >= FIXED_SIMULATION_STEP_MS;
}

function fixedSimulationBudgetExhausted(
  options: NormalizedSimulationAdvance,
  startedAt: number,
  lastStepMs: number,
  steps: number,
): boolean {
  const spent = Math.max(0, options.now() - startedAt);
  return steps > 0 && (spent >= options.cpuBudgetMs || spent + lastStepMs > options.cpuBudgetMs);
}

export function fixedSimulationStepDecision(
  due: boolean,
  steps: number,
  options: NormalizedSimulationAdvance,
  startedAt: number,
  lastStepMs: number,
): 'complete' | 'constrained' | 'step' {
  if (!due && steps >= options.minimumSteps) return 'complete';
  return fixedSimulationBudgetExhausted(options, startedAt, lastStepMs, steps)
    ? 'constrained'
    : 'step';
}

export function fixedSimulationBacklogShouldDrop(
  clock: GraphLayoutFixedTimestepClock,
  constrained: boolean,
  steps: number,
): boolean {
  return constrained || (steps >= MAX_SIMULATION_SUBSTEPS && fixedSimulationStepDue(clock));
}

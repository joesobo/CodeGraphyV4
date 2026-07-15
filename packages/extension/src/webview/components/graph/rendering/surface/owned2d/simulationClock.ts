import type { GraphLayoutTickResult } from '@codegraphy-dev/graph-renderer';
import { normalizeSimulationAdvance, runFixedSimulation } from './simulationSteps';

export const FIXED_SIMULATION_STEP_MS = 1_000 / 144;
export const MAX_SIMULATION_SUBSTEPS = 4;

export interface GraphLayoutFixedTimestepClock { accumulatorMs: number; lastFrameTimestampMs: number | null }
export interface GraphLayoutFixedTimestepAdvance {
  cpuBudgetMs?: number;
  currentSettled: boolean;
  minimumSteps?: number;
  now?: () => number;
  step(): GraphLayoutTickResult;
  timestampMs: number;
}

export function createGraphLayoutFixedTimestepClock(): GraphLayoutFixedTimestepClock {
  return { accumulatorMs: 0, lastFrameTimestampMs: null };
}

export function resetGraphLayoutFixedTimestepClock(clock: GraphLayoutFixedTimestepClock): void {
  clock.accumulatorMs = 0;
  clock.lastFrameTimestampMs = null;
}

function accumulateFrameTime(clock: GraphLayoutFixedTimestepClock, timestampMs: number): void {
  const fallback = clock.lastFrameTimestampMs ?? 0;
  const safeTimestamp = Number.isFinite(timestampMs) && timestampMs >= 0 ? timestampMs : fallback;
  const elapsed = clock.lastFrameTimestampMs === null
    ? FIXED_SIMULATION_STEP_MS
    : Math.max(0, safeTimestamp - clock.lastFrameTimestampMs);
  clock.lastFrameTimestampMs = safeTimestamp;
  clock.accumulatorMs = Math.min(clock.accumulatorMs + elapsed,
    FIXED_SIMULATION_STEP_MS * MAX_SIMULATION_SUBSTEPS);
}

export function advanceGraphLayoutFixedTimestep(
  clock: GraphLayoutFixedTimestepClock,
  advance: GraphLayoutFixedTimestepAdvance,
): GraphLayoutTickResult {
  accumulateFrameTime(clock, advance.timestampMs);
  return runFixedSimulation(clock, advance, normalizeSimulationAdvance(advance));
}

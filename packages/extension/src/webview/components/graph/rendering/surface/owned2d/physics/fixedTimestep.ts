import type { GraphLayoutTickResult } from './contracts';

export const FIXED_SIMULATION_HZ = 144;
export const FIXED_SIMULATION_STEP_MS = 1_000 / FIXED_SIMULATION_HZ;
export const MAX_SIMULATION_SUBSTEPS = 4;
export const DEFAULT_SIMULATION_CPU_BUDGET_MS = 4;

const STEP_EPSILON_MS = 1e-6;

export interface GraphLayoutFixedTimestepClock {
  accumulatorMs: number;
  lastFrameTimestampMs: number | null;
}

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

export function resetGraphLayoutFixedTimestepClock(
  clock: GraphLayoutFixedTimestepClock,
): void {
  clock.accumulatorMs = 0;
  clock.lastFrameTimestampMs = null;
}

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function advanceGraphLayoutFixedTimestep(
  clock: GraphLayoutFixedTimestepClock,
  advance: GraphLayoutFixedTimestepAdvance,
): GraphLayoutTickResult {
  const now = advance.now ?? (() => performance.now());
  const cpuBudgetMs = finiteNonNegative(
    advance.cpuBudgetMs ?? DEFAULT_SIMULATION_CPU_BUDGET_MS,
    DEFAULT_SIMULATION_CPU_BUDGET_MS,
  );
  const minimumSteps = Math.max(0, Math.floor(finiteNonNegative(
    advance.minimumSteps ?? 0,
    0,
  )));
  const timestampMs = finiteNonNegative(
    advance.timestampMs,
    clock.lastFrameTimestampMs ?? 0,
  );
  const elapsedMs = clock.lastFrameTimestampMs === null
    ? FIXED_SIMULATION_STEP_MS
    : Math.max(0, timestampMs - clock.lastFrameTimestampMs);
  clock.lastFrameTimestampMs = timestampMs;
  clock.accumulatorMs = Math.min(
    clock.accumulatorMs + elapsedMs,
    FIXED_SIMULATION_STEP_MS * MAX_SIMULATION_SUBSTEPS,
  );

  const cpuStartedAt = now();
  let lastStepCpuMs = 0;
  let moving = !advance.currentSettled;
  let settled = advance.currentSettled;
  let steps = 0;
  let constrained = false;

  while (steps < MAX_SIMULATION_SUBSTEPS) {
    const fixedStepDue = clock.accumulatorMs + STEP_EPSILON_MS >= FIXED_SIMULATION_STEP_MS;
    if (!fixedStepDue && steps >= minimumSteps) break;
    const spentCpuMs = Math.max(0, now() - cpuStartedAt);
    if (
      steps > 0
      && (spentCpuMs >= cpuBudgetMs || spentCpuMs + lastStepCpuMs > cpuBudgetMs)
    ) {
      constrained = true;
      break;
    }

    const stepStartedAt = now();
    const result = advance.step();
    lastStepCpuMs = Math.max(0, now() - stepStartedAt);
    if (fixedStepDue) {
      clock.accumulatorMs = Math.max(0, clock.accumulatorMs - FIXED_SIMULATION_STEP_MS);
    }
    moving = result.moving;
    settled = result.settled;
    steps += result.steps;
    if (result.steps === 0 || result.settled) break;
  }

  if (
    constrained
    || (steps >= MAX_SIMULATION_SUBSTEPS
      && clock.accumulatorMs + STEP_EPSILON_MS >= FIXED_SIMULATION_STEP_MS)
  ) {
    clock.accumulatorMs %= FIXED_SIMULATION_STEP_MS;
  }

  return { moving, settled, steps };
}

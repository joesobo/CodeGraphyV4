import type { GraphLayoutTickResult } from './contracts';

const FIXED_SIMULATION_HZ = 144;
export const FIXED_SIMULATION_STEP_MS = 1_000 / FIXED_SIMULATION_HZ;
export const MAX_SIMULATION_SUBSTEPS = 4;
const DEFAULT_SIMULATION_CPU_BUDGET_MS = 4;

const STEP_EPSILON_MS = 1e-6;

type FixedSimulationDecision = 'complete' | 'constrained' | 'step';

export interface GraphLayoutFixedTimestepClock {
  accumulatorMs: number;
  lastFrameTimestampMs: number | null;
}

interface GraphLayoutFixedTimestepAdvance {
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

function currentTime(): number {
  return performance.now();
}

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function fixedStepDue(clock: GraphLayoutFixedTimestepClock): boolean {
  return clock.accumulatorMs + STEP_EPSILON_MS >= FIXED_SIMULATION_STEP_MS;
}

function accumulateFrameTime(
  clock: GraphLayoutFixedTimestepClock,
  timestampMs: number,
): void {
  const safeTimestampMs = finiteNonNegative(
    timestampMs,
    clock.lastFrameTimestampMs ?? 0,
  );
  const elapsedMs = clock.lastFrameTimestampMs === null
    ? FIXED_SIMULATION_STEP_MS
    : Math.max(0, safeTimestampMs - clock.lastFrameTimestampMs);
  clock.lastFrameTimestampMs = safeTimestampMs;
  clock.accumulatorMs = Math.min(
    clock.accumulatorMs + elapsedMs,
    FIXED_SIMULATION_STEP_MS * MAX_SIMULATION_SUBSTEPS,
  );
}

function minimumSimulationSteps(value: number | undefined): number {
  return Math.max(0, Math.floor(finiteNonNegative(value ?? 0, 0)));
}

function simulationCpuBudget(value: number | undefined): number {
  return finiteNonNegative(
    value ?? DEFAULT_SIMULATION_CPU_BUDGET_MS,
    DEFAULT_SIMULATION_CPU_BUDGET_MS,
  );
}

function nextSimulationDecision(
  due: boolean,
  steps: number,
  minimumSteps: number,
  cpuStartedAt: number,
  lastStepCpuMs: number,
  cpuBudgetMs: number,
  now: () => number,
): FixedSimulationDecision {
  if (!due && steps >= minimumSteps) return 'complete';
  const spentCpuMs = Math.max(0, now() - cpuStartedAt);
  const exhaustedBudget = spentCpuMs >= cpuBudgetMs
    || spentCpuMs + lastStepCpuMs > cpuBudgetMs;
  return steps > 0 && exhaustedBudget ? 'constrained' : 'step';
}

function shouldDropBacklog(
  clock: GraphLayoutFixedTimestepClock,
  constrained: boolean,
  steps: number,
): boolean {
  return constrained
    || (steps >= MAX_SIMULATION_SUBSTEPS && fixedStepDue(clock));
}

function runSimulation(
  clock: GraphLayoutFixedTimestepClock,
  advance: GraphLayoutFixedTimestepAdvance,
  now: () => number,
  cpuBudgetMs: number,
  minimumSteps: number,
): GraphLayoutTickResult {
  const cpuStartedAt = now();
  let lastStepCpuMs = 0;
  let moving = !advance.currentSettled;
  let settled = advance.currentSettled;
  let steps = 0;
  let constrained = false;
  while (steps < MAX_SIMULATION_SUBSTEPS) {
    const due = fixedStepDue(clock);
    const decision = nextSimulationDecision(
      due,
      steps,
      minimumSteps,
      cpuStartedAt,
      lastStepCpuMs,
      cpuBudgetMs,
      now,
    );
    if (decision === 'complete') break;
    if (decision === 'constrained') {
      constrained = true;
      break;
    }
    const stepStartedAt = now();
    const result = advance.step();
    lastStepCpuMs = Math.max(0, now() - stepStartedAt);
    if (due) clock.accumulatorMs = Math.max(0, clock.accumulatorMs - FIXED_SIMULATION_STEP_MS);
    moving = result.moving;
    settled = result.settled;
    steps += result.steps;
    if (result.steps === 0 || result.settled) break;
  }
  if (shouldDropBacklog(clock, constrained, steps)) {
    clock.accumulatorMs %= FIXED_SIMULATION_STEP_MS;
  }
  return { moving, settled, steps };
}

export function advanceGraphLayoutFixedTimestep(
  clock: GraphLayoutFixedTimestepClock,
  advance: GraphLayoutFixedTimestepAdvance,
): GraphLayoutTickResult {
  accumulateFrameTime(clock, advance.timestampMs);
  return runSimulation(
    clock,
    advance,
    advance.now ?? currentTime,
    simulationCpuBudget(advance.cpuBudgetMs),
    minimumSimulationSteps(advance.minimumSteps),
  );
}

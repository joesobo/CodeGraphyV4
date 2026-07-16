import type { GraphLayoutFixedTimestepAdvance } from './clock';

export interface NormalizedSimulationAdvance { cpuBudgetMs: number; minimumSteps: number; now: () => number }

function nonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function normalizeSimulationAdvance(advance: GraphLayoutFixedTimestepAdvance): NormalizedSimulationAdvance {
  return {
    cpuBudgetMs: nonNegative(advance.cpuBudgetMs ?? 4, 4),
    minimumSteps: Math.max(0, Math.floor(nonNegative(advance.minimumSteps ?? 0, 0))),
    now: advance.now ?? (() => performance.now()),
  };
}

import { describe, expect, it, vi } from 'vitest';
import {
  advanceGraphLayoutFixedTimestep,
  createGraphLayoutFixedTimestepClock,
  FIXED_SIMULATION_STEP_MS,
  MAX_SIMULATION_SUBSTEPS,
  resetGraphLayoutFixedTimestepClock,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/fixedTimestep';

function movingStep() {
  return { moving: true, settled: false, steps: 1 } as const;
}

describe('owned graph fixed-timestep simulation', () => {
  it('substeps faster than a 60 Hz presentation when simulation work is cheap', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    const step = vi.fn(movingStep);

    const first = advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => 0,
      step,
      timestampMs: 0,
    });
    const second = advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => 0,
      step,
      timestampMs: 1_000 / 60,
    });

    expect(first.steps).toBe(1);
    expect(second.steps).toBeGreaterThan(1);
    expect(step).toHaveBeenCalledTimes(first.steps + second.steps);
  });

  it('caps catch-up work after a long presentation stall', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    const step = vi.fn(movingStep);

    advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => 0,
      step,
      timestampMs: 0,
    });
    const result = advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => 0,
      step,
      timestampMs: 10_000,
    });

    expect(result.steps).toBe(MAX_SIMULATION_SUBSTEPS);
    expect(clock.accumulatorMs).toBeLessThan(FIXED_SIMULATION_STEP_MS);
  });

  it('uses a soft CPU budget and drops backlog instead of spiraling', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    let cpuMs = 0;
    const step = vi.fn(() => {
      cpuMs += 3;
      return movingStep();
    });

    advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => cpuMs,
      step,
      timestampMs: 0,
    });
    const result = advanceGraphLayoutFixedTimestep(clock, {
      cpuBudgetMs: 4,
      currentSettled: false,
      now: () => cpuMs,
      step,
      timestampMs: 1_000 / 30,
    });

    expect(result.steps).toBe(1);
    expect(clock.accumulatorMs).toBeLessThan(FIXED_SIMULATION_STEP_MS);
  });

  it('can guarantee one interaction step without using progress as a render gate', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    const step = vi.fn(movingStep);

    advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      minimumSteps: 1,
      now: () => 0,
      step,
      timestampMs: 0,
    });
    const result = advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      minimumSteps: 1,
      now: () => 0,
      step,
      timestampMs: 1,
    });

    expect(result.steps).toBe(1);
    expect(step).toHaveBeenCalledTimes(2);
  });

  it('stops substepping as soon as the engine settles', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    const step = vi.fn(() => ({ moving: false, settled: true, steps: 1 }));

    const result = advanceGraphLayoutFixedTimestep(clock, {
      currentSettled: false,
      now: () => 0,
      step,
      timestampMs: 1_000,
    });

    expect(result).toEqual({ moving: false, settled: true, steps: 1 });
    expect(step).toHaveBeenCalledOnce();
  });

  it('resets wall-clock debt before an idle simulation wakes', () => {
    const clock = createGraphLayoutFixedTimestepClock();
    clock.accumulatorMs = 100;
    clock.lastFrameTimestampMs = 1;

    resetGraphLayoutFixedTimestepClock(clock);

    expect(clock).toEqual({ accumulatorMs: 0, lastFrameTimestampMs: null });
  });
});

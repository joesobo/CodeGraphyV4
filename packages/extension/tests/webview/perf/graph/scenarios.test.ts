import { describe, expect, it, vi } from 'vitest';

import type { PerfOperation } from '../../../../src/shared/perf/protocol';
import {
  createGraphPerfScenarios,
  INTERACTION_BURST_FRAME_COUNT,
} from '../../../../src/webview/perf/graph/scenarios';

const interactionOperation: PerfOperation = {
  dimension: 'medium',
  operationId: 'interaction-1',
  runId: 'run-1',
  scenario: 'interaction-burst',
};

const idleOperation: PerfOperation = {
  dimension: 'medium',
  operationId: 'idle-1',
  runId: 'run-1',
  scenario: 'idle-watch',
};

function setup(waitForSettle = true) {
  let now = 100;
  let nextFrame = 1;
  let nextTimer = 100;
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, () => void>();
  const emitFor = vi.fn(() => true);
  const setTickEnabled = vi.fn();
  const frameMetrics = {
    cancel: vi.fn(),
    completeIdle: vi.fn(),
    completeInteraction: vi.fn(),
    startIdle: vi.fn(),
    startInteraction: vi.fn(),
    startSettle: vi.fn(),
  };
  const runInteractionBurst = vi.fn(() => ({ waitForSettle }));
  const scenarios = createGraphPerfScenarios({
    bridge: { emitFor },
    cancelFrame: frame => frames.delete(frame),
    clearTimer: timer => timers.delete(timer),
    frameMetrics,
    now: () => now,
    requestFrame: callback => {
      const frame = nextFrame;
      nextFrame += 1;
      frames.set(frame, callback);
      return frame;
    },
    runInteractionBurst,
    setTickEnabled,
    setTimer: (callback) => {
      const timer = nextTimer;
      nextTimer += 1;
      timers.set(timer, callback);
      return timer;
    },
  });
  return {
    emitFor,
    frameMetrics,
    frames,
    runInteractionBurst,
    scenarios,
    setNow: (value: number) => { now = value; },
    setTickEnabled,
    timers,
  };
}

function runNextFrame(frames: Map<number, FrameRequestCallback>): void {
  const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
  if (!entry) throw new Error('Expected a queued frame');
  frames.delete(entry[0]);
  entry[1](0);
}

function runInteractionWorkload(frames: Map<number, FrameRequestCallback>): void {
  for (let index = 0; index < INTERACTION_BURST_FRAME_COUNT; index += 1) {
    runNextFrame(frames);
  }
}

function runNextTimer(timers: Map<number, () => void>): void {
  const entry = timers.entries().next().value as [number, () => void] | undefined;
  if (!entry) throw new Error('Expected a queued timer');
  timers.delete(entry[0]);
  entry[1]();
}

describe('webview/perf/graph/scenarios', () => {
  it('sustains the deterministic interaction workload across multiple frames', () => {
    const { frameMetrics, frames, runInteractionBurst, scenarios } = setup(true);
    scenarios.startInteractionBurst(interactionOperation);

    for (let index = 0; index < INTERACTION_BURST_FRAME_COUNT; index += 1) {
      runNextFrame(frames);
      expect(runInteractionBurst).toHaveBeenCalledTimes(index + 1);
      if (index < INTERACTION_BURST_FRAME_COUNT - 1) {
        expect(frameMetrics.startSettle).not.toHaveBeenCalled();
      }
    }

    expect(INTERACTION_BURST_FRAME_COUNT).toBeGreaterThan(1);
    expect(frameMetrics.startSettle).toHaveBeenCalledWith(interactionOperation);
  });

  it('waits for both the post-burst frame and physics settle before completing', () => {
    const { emitFor, frameMetrics, frames, scenarios, setNow } = setup(true);
    scenarios.startInteractionBurst(interactionOperation);
    expect(frameMetrics.startInteraction).toHaveBeenCalledWith(interactionOperation);

    runInteractionWorkload(frames);
    expect(frameMetrics.startSettle).toHaveBeenCalledWith(interactionOperation);
    scenarios.engineStopped();
    expect(emitFor).not.toHaveBeenCalled();

    setNow(175);
    runNextFrame(frames);

    expect(emitFor).toHaveBeenCalledWith(interactionOperation, {
      kind: 'interaction-complete',
      interaction: 'burst',
      durationMs: 75,
    });
    expect(frameMetrics.completeInteraction).toHaveBeenCalledWith(interactionOperation);
  });

  it('completes after the post-burst frame when no simulation was reheated', () => {
    const { emitFor, frames, scenarios } = setup(false);
    scenarios.startInteractionBurst(interactionOperation);

    runInteractionWorkload(frames);
    runNextFrame(frames);

    expect(emitFor).toHaveBeenCalledWith(
      interactionOperation,
      expect.objectContaining({ kind: 'interaction-complete' }),
    );
  });

  it('starts the idle timer only after physics has settled', () => {
    const { emitFor, frameMetrics, scenarios, timers } = setup();

    scenarios.startIdleWatch(idleOperation, 1_000);

    expect(timers.size).toBe(0);
    expect(frameMetrics.startIdle).not.toHaveBeenCalled();
    scenarios.engineStopped();
    expect(timers.size).toBe(1);
    expect(frameMetrics.startIdle).toHaveBeenCalledWith(idleOperation);
    expect(emitFor).toHaveBeenCalledWith(idleOperation, {
      kind: 'idle-started',
      durationMs: 1_000,
    });
  });

  it('counts real engine ticks only during the settled idle window', () => {
    const { emitFor, frameMetrics, scenarios, setNow, timers } = setup();
    scenarios.startIdleWatch(idleOperation, 1_000);
    scenarios.engineTick();
    scenarios.engineStopped();
    scenarios.engineTick();
    scenarios.engineTick();

    setNow(1_100);
    runNextTimer(timers);

    expect(frameMetrics.completeIdle).toHaveBeenCalledWith(idleOperation);
    expect(emitFor.mock.calls).toEqual([
      [idleOperation, {
        kind: 'idle-started',
        durationMs: 1_000,
      }],
      [idleOperation, {
        kind: 'metric',
        metric: 'simTicksAfterSettle',
        unit: 'count',
        value: 2,
      }],
      [idleOperation, {
        kind: 'idle-complete',
        durationMs: 1_000,
      }],
    ]);
  });

  it('cancels all scheduled work and tick collection', () => {
    const { emitFor, frameMetrics, frames, scenarios, setTickEnabled, timers } = setup();
    scenarios.startInteractionBurst(interactionOperation);
    scenarios.startIdleWatch(idleOperation, 1_000);
    scenarios.engineStopped();

    scenarios.cancel();

    expect(frames.size).toBe(0);
    expect(timers.size).toBe(0);
    expect(setTickEnabled).toHaveBeenLastCalledWith(false);
    expect(frameMetrics.cancel).toHaveBeenCalled();
    expect(emitFor.mock.calls).toEqual([[
      idleOperation,
      { kind: 'idle-started', durationMs: 1_000 },
    ]]);
  });
});

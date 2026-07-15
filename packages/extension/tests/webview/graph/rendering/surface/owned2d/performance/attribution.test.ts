import { describe, expect, it, vi } from 'vitest';

import {
  createOwnedGraphStageAttributionProfiler,
  OWNED_GRAPH_ATTRIBUTION_STAGES,
  type OwnedGraphAttributionStage,
  type OwnedGraphStageAttributionProfiler,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/attribution';

function recordTimedDuration(
  profiler: OwnedGraphStageAttributionProfiler,
  stage: OwnedGraphAttributionStage,
  advanceClock: () => void,
): void {
  const startedAt = profiler.startTiming();
  advanceClock();
  profiler.finishTiming(stage, startedAt);
}

describe('owned graph stage attribution profiler', () => {
  it('is disabled by default and does not read the clock or retain events', () => {
    const clock = vi.fn(() => 10);
    const profiler = createOwnedGraphStageAttributionProfiler({ clock });

    expect(profiler.startTiming()).toBeNull();
    profiler.finishTiming('geometryRebuild', null);
    profiler.recordRenderedFrame();

    expect(profiler.stop()).toBeNull();
    expect(clock).not.toHaveBeenCalled();
  });

  it('records timed durations with summaries normalized per rendered frame', () => {
    let now = 100;
    const profiler = createOwnedGraphStageAttributionProfiler({ clock: () => now });

    profiler.start();
    recordTimedDuration(profiler, 'geometryRebuild', () => { now += 5; });
    recordTimedDuration(profiler, 'geometryRebuild', () => { now += 3; });
    recordTimedDuration(profiler, 'workerRoundTrip', () => { now += 12; });
    profiler.recordRenderedFrame();
    profiler.recordRenderedFrame();
    const recording = profiler.stop();

    expect(recording).not.toBeNull();
    expect(recording).toMatchObject({
      schemaVersion: 1,
      startedAtMs: 100,
      endedAtMs: 120,
      physicsHome: 'main-thread',
      renderedFrameCount: 2,
      truncated: false,
    });
    expect(recording?.stages.geometryRebuild).toEqual({
      scope: 'frame-cpu',
      eventCount: 2,
      totalMs: 8,
      meanEventMs: 4,
      p95EventMs: 5,
      maximumEventMs: 5,
      perRenderedFrameMs: 4,
    });
    expect(recording?.stages.workerRoundTrip).toMatchObject({
      scope: 'latency',
      eventCount: 1,
      totalMs: 12,
      perRenderedFrameMs: 6,
    });
  });

  it('emits every declared stage with its attribution scope', () => {
    const profiler = createOwnedGraphStageAttributionProfiler({ clock: () => 1 });
    profiler.start();
    const recording = profiler.stop();

    expect(Object.keys(recording?.stages ?? {})).toEqual(OWNED_GRAPH_ATTRIBUTION_STAGES);
    const expectedScopes: Record<OwnedGraphAttributionStage, string> = {
      frameTotalCpu: 'frame-cpu',
      physicsStep: 'frame-cpu',
      workerSimulationCpu: 'worker-cpu',
      workerRoundTrip: 'latency',
      snapshotApply: 'host-async-cpu',
      snapshotNodeSync: 'frame-cpu',
      interpolatorSample: 'frame-cpu',
      styleCacheRebuild: 'frame-cpu',
      geometryRebuild: 'frame-cpu',
      gpuBufferWrites: 'frame-cpu',
      gpuEncodeSubmit: 'frame-cpu',
      canvasPrepare: 'frame-cpu',
      overlay: 'frame-cpu',
      pickingHover: 'event',
      reactReconciliation: 'event',
      propsRuntimeReconciliation: 'event',
    };
    for (const stage of OWNED_GRAPH_ATTRIBUTION_STAGES) {
      expect(recording?.stages[stage]).toMatchObject({
        scope: expectedScopes[stage],
        eventCount: 0,
        totalMs: 0,
        meanEventMs: 0,
        p95EventMs: 0,
        maximumEventMs: 0,
        perRenderedFrameMs: 0,
      });
    }
  });

  it('bounds percentile samples while retaining exact totals and maxima', () => {
    let now = 0;
    const profiler = createOwnedGraphStageAttributionProfiler({
      clock: () => now,
      maximumSamplesPerStage: 3,
    });
    profiler.start();
    for (const duration of [1, 2, 3, 100]) {
      recordTimedDuration(profiler, 'pickingHover', () => { now += duration; });
    }
    profiler.recordRenderedFrame();
    const recording = profiler.stop();

    expect(recording?.truncated).toBe(true);
    expect(recording?.stages.pickingHover).toMatchObject({
      eventCount: 4,
      totalMs: 106,
      meanEventMs: 26.5,
      p95EventMs: 3,
      maximumEventMs: 100,
      perRenderedFrameMs: 106,
    });
  });

  it('returns an immutable snapshot that later sessions cannot mutate', () => {
    let now = 0;
    const profiler = createOwnedGraphStageAttributionProfiler({ clock: () => now });
    profiler.start();
    recordTimedDuration(profiler, 'physicsStep', () => { now += 4; });
    profiler.recordRenderedFrame();
    const first = profiler.stop();

    profiler.start();
    recordTimedDuration(profiler, 'physicsStep', () => { now += 9; });
    profiler.recordRenderedFrame();
    const second = profiler.stop();

    expect(first?.stages.physicsStep.totalMs).toBe(4);
    expect(second?.stages.physicsStep.totalMs).toBe(9);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.stages)).toBe(true);
    expect(Object.isFrozen(first?.stages.physicsStep)).toBe(true);
  });

  it('resets an active session', () => {
    let now = 0;
    const profiler = createOwnedGraphStageAttributionProfiler({ clock: () => now });
    profiler.start();
    recordTimedDuration(profiler, 'overlay', () => { now += 7; });
    profiler.start();
    const recording = profiler.stop();

    expect(recording?.startedAtMs).toBe(7);
    expect(recording?.stages.overlay.eventCount).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';

import {
  aggregateGraphStageAttribution,
  FRAME_BUDGET_MS,
  GRAPH_ATTRIBUTION_STAGES,
  type GraphStageAttributionRecording,
} from '../../src/metrics/attribution';

function recording(
  physicsHome: 'main-thread' | 'worker',
  renderedFrameCount: number,
  physicsTotalMs: number,
): GraphStageAttributionRecording {
  const stages = Object.fromEntries(GRAPH_ATTRIBUTION_STAGES.map(stage => [stage, {
    scope: stage === 'workerRoundTrip' ? 'latency' as const : 'frame-cpu' as const,
    eventCount: stage === 'physicsStep' ? renderedFrameCount : 0,
    totalMs: stage === 'physicsStep' ? physicsTotalMs : 0,
    meanEventMs: stage === 'physicsStep' ? physicsTotalMs / renderedFrameCount : 0,
    p95EventMs: stage === 'physicsStep' ? physicsTotalMs / renderedFrameCount + 1 : 0,
    maximumEventMs: stage === 'physicsStep' ? physicsTotalMs : 0,
    perRenderedFrameMs: stage === 'physicsStep' ? physicsTotalMs / renderedFrameCount : 0,
  }])) as GraphStageAttributionRecording['stages'];
  return {
    schemaVersion: 1,
    startedAtMs: 0,
    endedAtMs: 10,
    physicsHome,
    renderedFrameCount,
    stages,
    truncated: false,
  };
}

describe('aggregateGraphStageAttribution', () => {
  it('weights stage cost by rendered frames and reports its 6.9 ms budget share', () => {
    const aggregate = aggregateGraphStageAttribution([
      recording('worker', 100, 200),
      recording('worker', 300, 900),
    ]);

    expect(aggregate).toMatchObject({
      physicsHome: 'worker',
      renderedFrameCount: 400,
      runCount: 2,
      truncated: false,
    });
    expect(aggregate.stages.physicsStep).toMatchObject({
      eventCount: 400,
      totalMs: 1_100,
      meanEventMs: 2.75,
      perRenderedFrameMs: 2.75,
      p95EventMs: 4,
      maximumEventMs: 900,
    });
    expect(aggregate.stages.physicsStep.budgetPct)
      .toBeCloseTo((2.75 / FRAME_BUDGET_MS) * 100);
  });

  it('rejects empty, mixed-home, and frame-free recordings', () => {
    expect(() => aggregateGraphStageAttribution([])).toThrow('at least one');
    expect(() => aggregateGraphStageAttribution([
      recording('worker', 1, 1),
      recording('main-thread', 1, 1),
    ])).toThrow('one identified physics home');
    expect(() => aggregateGraphStageAttribution([
      recording('worker', 0, 0),
    ])).toThrow('no rendered frames');
  });
});

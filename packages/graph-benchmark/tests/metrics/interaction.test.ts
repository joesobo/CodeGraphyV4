import { describe, expect, it } from 'vitest';

import {
  assessInteractionRecording,
  DEFAULT_INTERACTION_THRESHOLDS,
  type RecordedInteractionFrame,
} from '../../src/metrics/interaction';

function frame(
  presentationTimestampMs: number,
  targetX: number,
  neighborX: number,
  kineticEnergy: number,
  settled = false,
): RecordedInteractionFrame {
  return {
    alpha: settled ? 0 : 0.3,
    kineticEnergy,
    neighbors: [{ id: 'leaf', x: neighborX, y: 0 }],
    presentationTimestampMs,
    renderMs: 3,
    settled,
    simulationMs: 2,
    steps: settled ? 0 : 1,
    target: { id: 'hub', x: targetX, y: 0 },
    totalCpuMs: 5,
  };
}

function activeHud(sampleCount: number) {
  return {
    status: 'active' as const,
    displayedFps: 6_000 / 56,
    potentialFps: 200,
    frameTimeMs: { average: 5, maximum: 5, onePercentHigh: 5 },
    renderTimeMs: { average: 3, maximum: 3, onePercentHigh: 3 },
    sampleCount,
    simulationTimeMs: { average: 2, maximum: 2, onePercentHigh: 2 },
  };
}

describe('interaction performance metrics', () => {
  it('separates potential throughput from displayed cadence and proves responsive continuity', () => {
    const assessment = assessInteractionRecording({
      frames: [
        frame(0, 0, 0, 9),
        frame(6, 10, 1, 8),
        frame(16, 20, 2, 7),
        frame(26, 20, 3, 4),
        frame(36, 20, 3.5, 2),
        frame(46, 20, 3.75, 1),
        frame(56, 20, 3.9, 0.01, true),
      ],
      inputs: [
        { eventTimestampMs: 1, nodeId: 'hub', phase: 'down', sequence: 0, targetX: 0, targetY: 0 },
        { eventTimestampMs: 5, nodeId: 'hub', phase: 'move', sequence: 1, targetX: 10, targetY: 0 },
        { eventTimestampMs: 15, nodeId: 'hub', phase: 'move', sequence: 2, targetX: 20, targetY: 0 },
        { eventTimestampMs: 25, nodeId: 'hub', phase: 'up', sequence: 3, targetX: 20, targetY: 0 },
      ],
      neighborNodeIds: ['leaf'],
      targetNodeId: 'hub',
      truncated: false,
    }, activeHud(7), {
      ...DEFAULT_INTERACTION_THRESHOLDS,
      settleEnvelopeWindowFrames: 1,
    });

    expect(assessment.timing.potentialFps).toBe(200);
    expect(assessment.timing.displayedFps).toBeCloseTo(107.142_857, 5);
    expect(assessment.timing.simulationStepCount).toBe(6);
    expect(assessment.timing.simulationStepsPerFrame).toBeCloseTo(6 / 7, 8);
    expect(assessment.timing.simulationStepsPerSecond).toBeCloseTo(107.142_857, 5);
    expect(assessment.timing.cpuFrameTimeMs).toMatchObject({
      mean: 5,
      p95: 5,
      p99: 5,
      max: 5,
    });
    expect(assessment.interaction.targetLatencyFrames).toMatchObject({
      maximum: 1,
      missedInputCount: 0,
    });
    expect(assessment.interaction.neighborLatencyFrames).toMatchObject({
      maximum: 1,
      missedInputCount: 0,
    });
    expect(assessment.interaction.frozenFrameCount).toBe(0);
    expect(assessment.interaction.teleportFrameCount).toBe(0);
    expect(assessment.settle.monotonicEnvelope).toBe(true);
    expect(assessment.settle.sleptImperceptibly).toBe(true);
    expect(assessment.hudAgreement?.withinTenPercent).toBe(true);
  });

  it('makes dropped displayed frames visible without lowering CPU potential', () => {
    const frames = [
      frame(0, 0, 0, 1),
      frame(10, 1, 1, 1),
      frame(30, 2, 2, 1),
    ];
    const assessment = assessInteractionRecording({
      frames,
      inputs: [],
      neighborNodeIds: ['leaf'],
      targetNodeId: 'hub',
      truncated: false,
    }, null, DEFAULT_INTERACTION_THRESHOLDS);

    expect(assessment.timing.displayedFps).toBeCloseTo(66.666_666, 5);
    expect(assessment.timing.potentialFps).toBe(200);
  });

  it('counts frozen-neighbor and implausible-jump frames and rejects late settle energy', () => {
    const assessment = assessInteractionRecording({
      frames: [
        frame(0, 0, 0, 3),
        frame(10, 10, 0, 3),
        frame(20, 20, 200, 2),
        frame(30, 20, 201, 1),
        frame(40, 20, 202, 2, true),
      ],
      inputs: [
        { eventTimestampMs: 1, nodeId: 'hub', phase: 'down', sequence: 0, targetX: 0, targetY: 0 },
        { eventTimestampMs: 9, nodeId: 'hub', phase: 'move', sequence: 1, targetX: 10, targetY: 0 },
        { eventTimestampMs: 19, nodeId: 'hub', phase: 'move', sequence: 2, targetX: 20, targetY: 0 },
        { eventTimestampMs: 25, nodeId: 'hub', phase: 'up', sequence: 3, targetX: 20, targetY: 0 },
      ],
      neighborNodeIds: ['leaf'],
      targetNodeId: 'hub',
      truncated: false,
    }, null, {
      ...DEFAULT_INTERACTION_THRESHOLDS,
      settleEnvelopeWindowFrames: 1,
      teleportDistance: 100,
    });

    expect(assessment.interaction.frozenFrameCount).toBe(1);
    expect(assessment.interaction.teleportFrameCount).toBe(1);
    expect(assessment.settle.monotonicEnvelope).toBe(false);
    expect(assessment.settle.envelopeViolationCount).toBe(1);
  });
});

import { summarizeDistribution } from './distribution';

export interface RecordedPosition {
  id: string;
  x: number;
  y: number;
}

export interface RecordedInteractionFrame {
  alpha: number;
  kineticEnergy: number;
  latestInputSequence?: number | null;
  neighbors: RecordedPosition[];
  presentationTimestampMs: number;
  renderMs: number;
  settled: boolean;
  simulationMs: number;
  steps: number;
  target: RecordedPosition | null;
  totalCpuMs: number;
}

export interface RecordedInteractionInput {
  eventTimestampMs: number;
  nodeId: string | null;
  phase: 'down' | 'move' | 'up';
  sequence: number;
  targetX: number;
  targetY: number;
}

export interface InteractionRecording {
  frames: RecordedInteractionFrame[];
  inputs: RecordedInteractionInput[];
  neighborNodeIds: string[];
  targetNodeId: string;
  truncated: boolean;
}

interface PerformanceDistribution {
  average: number;
  maximum: number;
  onePercentHigh: number;
}

interface ActivePerformanceHudSample {
  status: 'active';
  displayedFps: number | null;
  potentialFps: number;
  frameTimeMs: PerformanceDistribution;
  renderTimeMs: PerformanceDistribution;
  sampleCount: number;
  simulationTimeMs: PerformanceDistribution;
}

export type PerformanceHudSample = ActivePerformanceHudSample | {
  status: 'idle';
  lastActive?: ActivePerformanceHudSample;
};

export interface InteractionThresholds {
  freezeDistance: number;
  imperceptibleEnergyPerNode: number;
  positionMatchDistance: number;
  settleEnvelopeToleranceRatio: number;
  settleEnvelopeWindowMs: number;
  teleportDistance: number;
}

export const DEFAULT_INTERACTION_THRESHOLDS: InteractionThresholds = {
  freezeDistance: 0.01,
  imperceptibleEnergyPerNode: 0.01,
  positionMatchDistance: 0.25,
  settleEnvelopeToleranceRatio: 0.05,
  settleEnvelopeWindowMs: 80,
  teleportDistance: 120,
};

interface LatencySummary {
  maximum: number | null;
  mean: number | null;
  missedInputCount: number;
  p95: number | null;
  sampleCount: number;
}

function distance(
  first: { x: number; y: number },
  second: { x: number; y: number },
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function displayedFps(frames: readonly RecordedInteractionFrame[]): number {
  if (frames.length < 2) return 0;
  const elapsedMs = frames.at(-1)!.presentationTimestampMs
    - frames[0].presentationTimestampMs;
  return elapsedMs > 0 ? ((frames.length - 1) * 1_000) / elapsedMs : 0;
}

function summarizeLatency(values: readonly number[], missedInputCount: number): LatencySummary {
  if (values.length === 0) {
    return {
      maximum: null,
      mean: null,
      missedInputCount,
      p95: null,
      sampleCount: 0,
    };
  }
  const summary = summarizeDistribution(values);
  return {
    maximum: summary.max,
    mean: summary.mean,
    missedInputCount,
    p95: summary.p95,
    sampleCount: values.length,
  };
}

function hasInputSequenceOrder(recording: InteractionRecording): boolean {
  return recording.frames.some(frame => frame.latestInputSequence !== undefined);
}

function framesFollowingInput(
  recording: InteractionRecording,
  input: RecordedInteractionInput,
): RecordedInteractionFrame[] {
  if (!hasInputSequenceOrder(recording)) {
    return recording.frames.filter(
      frame => frame.presentationTimestampMs >= input.eventTimestampMs,
    );
  }
  return recording.frames.filter(frame =>
    frame.latestInputSequence !== undefined
      && frame.latestInputSequence !== null
      && frame.latestInputSequence >= input.sequence,
  );
}

function targetLatency(
  recording: InteractionRecording,
  thresholds: InteractionThresholds,
): LatencySummary {
  const latencies: number[] = [];
  let missed = 0;
  for (const input of recording.inputs.filter(entry => entry.phase === 'move')) {
    const frames = framesFollowingInput(recording, input);
    const index = frames.findIndex(frame => frame.target !== null && distance(frame.target, {
      x: input.targetX,
      y: input.targetY,
    }) <= thresholds.positionMatchDistance);
    if (index < 0) missed += 1;
    else latencies.push(index + 1);
  }
  return summarizeLatency(latencies, missed);
}

function positionsById(frame: RecordedInteractionFrame): Map<string, RecordedPosition> {
  return new Map(frame.neighbors.map(position => [position.id, position]));
}

function neighborMoved(
  before: RecordedInteractionFrame,
  after: RecordedInteractionFrame,
  threshold: number,
): boolean {
  const previous = positionsById(before);
  return after.neighbors.some(position => {
    const old = previous.get(position.id);
    return old !== undefined && distance(old, position) > threshold;
  });
}

function neighborLatency(
  recording: InteractionRecording,
  thresholds: InteractionThresholds,
): LatencySummary {
  const latencies: number[] = [];
  let missed = 0;
  const sequenceOrdered = hasInputSequenceOrder(recording);
  for (const input of recording.inputs.filter(entry => entry.phase === 'move')) {
    const baseline = [...recording.frames]
      .reverse()
      .find(frame => sequenceOrdered
        ? frame.latestInputSequence === null
          || (frame.latestInputSequence !== undefined
            && frame.latestInputSequence < input.sequence)
        : frame.presentationTimestampMs < input.eventTimestampMs);
    const frames = framesFollowingInput(recording, input);
    if (!baseline) {
      missed += 1;
      continue;
    }
    const index = frames.findIndex(frame => neighborMoved(
      baseline,
      frame,
      thresholds.freezeDistance,
    ));
    if (index < 0) missed += 1;
    else latencies.push(index + 1);
  }
  return summarizeLatency(latencies, missed);
}

function dragWindow(recording: InteractionRecording): { start: number; end: number } | null {
  const down = recording.inputs.find(input => input.phase === 'down');
  const up = [...recording.inputs].reverse().find(input => input.phase === 'up');
  return down && up ? { start: down.eventTimestampMs, end: up.eventTimestampMs } : null;
}

function frozenFrameCount(
  recording: InteractionRecording,
  thresholds: InteractionThresholds,
): number {
  const window = dragWindow(recording);
  if (!window) return 0;
  let count = 0;
  for (let index = 1; index < recording.frames.length; index += 1) {
    const previous = recording.frames[index - 1];
    const current = recording.frames[index];
    if (
      current.presentationTimestampMs < window.start
      || current.presentationTimestampMs > window.end
      || !previous.target
      || !current.target
    ) continue;
    const targetMoved = distance(previous.target, current.target) > thresholds.freezeDistance;
    if (targetMoved && !neighborMoved(previous, current, thresholds.freezeDistance)) count += 1;
  }
  return count;
}

function teleportFrameCount(
  frames: readonly RecordedInteractionFrame[],
  threshold: number,
): { count: number; maximumJump: number } {
  let count = 0;
  let maximumJump = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];
    let frameMaximum = previous.target && current.target
      ? distance(previous.target, current.target)
      : 0;
    const previousNeighbors = positionsById(previous);
    for (const position of current.neighbors) {
      const old = previousNeighbors.get(position.id);
      if (old) frameMaximum = Math.max(frameMaximum, distance(old, position));
    }
    maximumJump = Math.max(maximumJump, frameMaximum);
    if (frameMaximum > threshold) count += 1;
  }
  return { count, maximumJump };
}

function settleAssessment(
  recording: InteractionRecording,
  thresholds: InteractionThresholds,
) {
  const release = [...recording.inputs].reverse().find(input => input.phase === 'up');
  const settleFrames = release
    ? recording.frames.filter(frame => frame.presentationTimestampMs >= release.eventTimestampMs)
    : [];
  const envelopes: number[] = [];
  const windowDurationMs = Math.max(1, thresholds.settleEnvelopeWindowMs);
  let window: RecordedInteractionFrame[] = [];
  let windowStartedAt = settleFrames[0]?.presentationTimestampMs ?? 0;
  const publishWindow = () => {
    if (window.length === 0) return;
    envelopes.push(Math.sqrt(
      window.reduce((sum, frame) => sum + frame.kineticEnergy ** 2, 0) / window.length,
    ));
    window = [];
  };
  for (const frame of settleFrames) {
    if (
      window.length > 0
      && frame.presentationTimestampMs - windowStartedAt >= windowDurationMs
    ) {
      publishWindow();
      windowStartedAt = frame.presentationTimestampMs;
    }
    window.push(frame);
  }
  publishWindow();
  let envelopeViolationCount = 0;
  let maximumLateIncreaseRatio = 0;
  for (let index = 1; index < envelopes.length; index += 1) {
    const previous = envelopes[index - 1];
    const ratio = previous > 0 ? envelopes[index] / previous : (envelopes[index] > 0 ? Infinity : 1);
    maximumLateIncreaseRatio = Math.max(maximumLateIncreaseRatio, ratio);
    if (ratio > 1 + thresholds.settleEnvelopeToleranceRatio) envelopeViolationCount += 1;
  }
  const finalFrame = settleFrames.at(-1);
  const trackedNodeCount = Math.max(1, 1 + recording.neighborNodeIds.length);
  const energyAtSleep = finalFrame?.kineticEnergy ?? Number.POSITIVE_INFINITY;
  return {
    durationMs: release && finalFrame
      ? finalFrame.presentationTimestampMs - release.eventTimestampMs
      : 0,
    energyAtSleep,
    envelopeViolationCount,
    maximumLateIncreaseRatio,
    monotonicEnvelope: settleFrames.length > 0 && envelopeViolationCount === 0,
    sleptImperceptibly: finalFrame?.settled === true
      && energyAtSleep / trackedNodeCount <= thresholds.imperceptibleEnergyPerNode,
  };
}

function percentageDifference(actual: number, expected: number | null): number | null {
  if (expected === null || !Number.isFinite(actual) || !Number.isFinite(expected)) return null;
  if (actual === 0) return expected === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(expected - actual) / Math.abs(actual) * 100;
}

function hudAgreement(
  frames: readonly RecordedInteractionFrame[],
  hud: PerformanceHudSample | null,
) {
  const sample = hud?.status === 'active' ? hud : hud?.lastActive;
  if (!sample || frames.length === 0) return null;
  const window = frames.slice(-Math.min(sample.sampleCount, frames.length));
  const frameTimes = window.map(frame => frame.totalCpuMs);
  const simulation = window.map(frame => frame.simulationMs);
  const render = window.map(frame => frame.renderMs);
  const frameSummary = summarizeDistribution(frameTimes);
  const simulationSummary = summarizeDistribution(simulation);
  const renderSummary = summarizeDistribution(render);
  const differences = {
    displayedFps: percentageDifference(displayedFps(window), sample.displayedFps),
    frameTimeAverage: percentageDifference(frameSummary.mean, sample.frameTimeMs.average),
    potentialFps: percentageDifference(1_000 / frameSummary.mean, sample.potentialFps),
    renderAverage: percentageDifference(renderSummary.mean, sample.renderTimeMs.average),
    simulationAverage: percentageDifference(
      simulationSummary.mean,
      sample.simulationTimeMs.average,
    ),
  };
  const visibleDifferences = [
    differences.frameTimeAverage,
    differences.potentialFps,
  ];
  return {
    differencesPct: differences,
    sampleCount: window.length,
    withinTenPercent: visibleDifferences.every(
      value => value !== null && Number.isFinite(value) && value <= 10,
    ),
  };
}

export function assessInteractionRecording(
  recording: InteractionRecording,
  hud: PerformanceHudSample | null,
  thresholds: InteractionThresholds,
) {
  if (recording.frames.length === 0) {
    throw new Error('Interaction recording contains no rendered frames');
  }
  const frameTimes = recording.frames.map(frame => frame.totalCpuMs);
  const simulationStepCount = recording.frames.reduce((sum, frame) => sum + frame.steps, 0);
  const simulationElapsedMs = recording.frames.length > 1
    ? recording.frames.at(-1)!.presentationTimestampMs
      - recording.frames[0].presentationTimestampMs
    : 0;
  const simulationTimes = recording.frames.map(frame => frame.simulationMs);
  const renderTimes = recording.frames.map(frame => frame.renderMs);
  const presentationIntervals = recording.frames.slice(1).map((frame, index) =>
    frame.presentationTimestampMs - recording.frames[index].presentationTimestampMs,
  );
  const teleports = teleportFrameCount(recording.frames, thresholds.teleportDistance);
  return {
    timing: {
      cpuFrameTimeMs: summarizeDistribution(frameTimes),
      displayedFps: displayedFps(recording.frames),
      potentialFps: 1_000 / summarizeDistribution(frameTimes).mean,
      simulationStepCount,
      simulationStepsPerFrame: simulationStepCount / recording.frames.length,
      simulationStepsPerSecond: simulationElapsedMs > 0
        ? simulationStepCount * 1_000 / simulationElapsedMs
        : 0,
      presentationIntervalMs: presentationIntervals.length > 0
        ? summarizeDistribution(presentationIntervals)
        : null,
      renderMs: summarizeDistribution(renderTimes),
      simulationMs: summarizeDistribution(simulationTimes),
    },
    interaction: {
      frozenFrameCount: frozenFrameCount(recording, thresholds),
      maximumJump: teleports.maximumJump,
      neighborLatencyFrames: neighborLatency(recording, thresholds),
      targetLatencyFrames: targetLatency(recording, thresholds),
      teleportFrameCount: teleports.count,
    },
    settle: settleAssessment(recording, thresholds),
    hudAgreement: hudAgreement(recording.frames, hud),
    thresholds: { ...thresholds },
    truncated: recording.truncated,
  };
}

export type InteractionAssessment = ReturnType<typeof assessInteractionRecording>;

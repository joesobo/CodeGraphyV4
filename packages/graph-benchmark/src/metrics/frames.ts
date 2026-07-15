import { summarizeDistribution } from './distribution';

export function renderedFrameIntervalsWithinWindow(
  frames: ReadonlyArray<{ presentationTimestampMs: number }>,
  startedAt: number,
  endedAt: number,
): number[] {
  const timestamps = frames
    .map(frame => frame.presentationTimestampMs)
    .filter(timestamp => timestamp >= startedAt && timestamp <= endedAt);
  return timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
}

export function estimateRefreshRate(frameTimesMs: readonly number[]): number {
  const interval = summarizeDistribution(frameTimesMs).p50;
  if (interval <= 0) throw new Error('RAF intervals must be positive');
  return 1_000 / interval;
}

export function summarizeRenderedFrames(
  frameTimesMs: readonly number[],
  durationMs: number,
  refreshRateHz: number,
) {
  if (durationMs <= 0) throw new Error('Frame scenario duration must be positive');
  if (refreshRateHz <= 0) throw new Error('Refresh rate must be positive');
  const fps = (frameTimesMs.length / durationMs) * 1_000;

  return {
    fps,
    refreshRateHz,
    refreshUtilization: Math.min(1, fps / refreshRateHz),
    frameTimeMs: {
      ...summarizeDistribution(frameTimesMs),
      over16ms: frameTimesMs.filter((frameTime) => frameTime > 16.67).length,
      over33ms: frameTimesMs.filter((frameTime) => frameTime > 33.33).length,
    },
  };
}

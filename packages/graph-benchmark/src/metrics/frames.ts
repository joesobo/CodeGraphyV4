import { summarizeDistribution } from './distribution';

export function summarizeRenderedFrames(
  frameTimesMs: readonly number[],
  durationMs: number,
) {
  if (durationMs <= 0) throw new Error('Frame scenario duration must be positive');

  return {
    fps: (frameTimesMs.length / durationMs) * 1_000,
    frameTimeMs: {
      ...summarizeDistribution(frameTimesMs),
      over16ms: frameTimesMs.filter((frameTime) => frameTime > 16.67).length,
      over33ms: frameTimesMs.filter((frameTime) => frameTime > 33.33).length,
    },
  };
}

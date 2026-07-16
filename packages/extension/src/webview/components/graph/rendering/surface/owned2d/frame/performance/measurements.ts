import { RollingPerformanceAverage } from './average';
import type {
  OwnedGraphFramePerformanceInput,
  OwnedGraphPerformanceSample,
} from './types';

const PUBLICATION_INTERVAL_MS = 500;

export class OwnedGraphPerformanceMeasurements {
  private readonly frameIntervals = new RollingPerformanceAverage();
  private readonly frameWork = new RollingPerformanceAverage();
  private readonly secondaryRefreshWork = new RollingPerformanceAverage();
  private lastFrameTimestamp: number | undefined;
  private lastPublishedAt = Number.NEGATIVE_INFINITY;

  record(input: OwnedGraphFramePerformanceInput): OwnedGraphPerformanceSample | undefined {
    const previousTimestamp = this.lastFrameTimestamp;
    if (previousTimestamp !== undefined) {
      const interval = input.presentationTimestampMs - previousTimestamp;
      if (!Number.isFinite(interval) || interval <= 0) return undefined;
      this.frameIntervals.add(interval);
    }
    this.lastFrameTimestamp = input.presentationTimestampMs;
    this.frameWork.add(input.renderMs + input.simulationMs);
    if (input.secondaryRefreshMs !== undefined) {
      this.secondaryRefreshWork.add(input.secondaryRefreshMs);
    }
    if (this.frameIntervals.count === 0
      || input.presentationTimestampMs - this.lastPublishedAt < PUBLICATION_INTERVAL_MS) {
      return undefined;
    }
    this.lastPublishedAt = input.presentationTimestampMs;
    return this.sample();
  }

  reset(): void {
    this.frameIntervals.reset();
    this.frameWork.reset();
    this.secondaryRefreshWork.reset();
    this.lastFrameTimestamp = undefined;
    this.lastPublishedAt = Number.NEGATIVE_INFINITY;
  }

  sample(): OwnedGraphPerformanceSample {
    if (this.frameIntervals.count === 0) return { status: 'idle' };
    const secondaryRefresh = this.secondaryRefreshWork.count > 0
      ? {
          secondaryRefreshMs: this.secondaryRefreshWork.average(),
          secondaryRefreshSampleCount: this.secondaryRefreshWork.count,
        }
      : {};
    return {
      status: 'active',
      frameTimeMs: this.frameWork.average(),
      renderedFps: 1_000 / this.frameIntervals.average(),
      sampleCount: this.frameWork.count,
      ...secondaryRefresh,
    };
  }
}

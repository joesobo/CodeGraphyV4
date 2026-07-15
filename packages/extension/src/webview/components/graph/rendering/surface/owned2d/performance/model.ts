const SAMPLE_CAPACITY = 120;
const PUBLICATION_INTERVAL_MS = 500;

export interface OwnedGraphFramePerformanceInput {
  presentationTimestampMs: number;
  renderMs: number;
  simulationMs: number;
}

export interface OwnedGraphActivePerformanceSample {
  status: 'active';
  frameTimeMs: number;
  potentialFps: number;
  sampleCount: number;
}

export interface OwnedGraphIdlePerformanceSample {
  status: 'idle';
}

export type OwnedGraphPerformanceSample =
  | OwnedGraphActivePerformanceSample
  | OwnedGraphIdlePerformanceSample;

export interface OwnedGraphPerformanceMonitor {
  recordFrame(input: OwnedGraphFramePerformanceInput): OwnedGraphPerformanceSample | undefined;
  reset(): void;
  sample(): OwnedGraphPerformanceSample;
  setIdle(): OwnedGraphIdlePerformanceSample;
}

class OwnedGraphFpsMonitor implements OwnedGraphPerformanceMonitor {
  private count = 0;
  private lastPublishedAt = Number.NEGATIVE_INFINITY;
  private nextIndex = 0;
  private readonly samples = new Float64Array(SAMPLE_CAPACITY);

  recordFrame(input: OwnedGraphFramePerformanceInput): OwnedGraphPerformanceSample | undefined {
    const frameTimeMs = input.renderMs + input.simulationMs;
    if (
      !Number.isFinite(input.presentationTimestampMs)
      || !Number.isFinite(frameTimeMs)
      || frameTimeMs <= 0
    ) return undefined;

    this.samples[this.nextIndex] = frameTimeMs;
    this.nextIndex = (this.nextIndex + 1) % SAMPLE_CAPACITY;
    this.count = Math.min(this.count + 1, SAMPLE_CAPACITY);
    if (input.presentationTimestampMs - this.lastPublishedAt < PUBLICATION_INTERVAL_MS) {
      return undefined;
    }
    this.lastPublishedAt = input.presentationTimestampMs;
    return this.sample();
  }

  reset(): void {
    this.count = 0;
    this.nextIndex = 0;
    this.lastPublishedAt = Number.NEGATIVE_INFINITY;
  }

  sample(): OwnedGraphPerformanceSample {
    if (this.count === 0) return { status: 'idle' };
    let total = 0;
    for (let index = 0; index < this.count; index += 1) total += this.samples[index];
    const frameTimeMs = total / this.count;
    return {
      status: 'active',
      frameTimeMs,
      potentialFps: 1_000 / frameTimeMs,
      sampleCount: this.count,
    };
  }

  setIdle(): OwnedGraphIdlePerformanceSample {
    this.reset();
    return { status: 'idle' };
  }
}

export function createOwnedGraphPerformanceMonitor(): OwnedGraphPerformanceMonitor {
  return new OwnedGraphFpsMonitor();
}

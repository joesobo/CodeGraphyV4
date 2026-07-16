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
  renderedFps: number;
  sampleCount: number;
}

export interface OwnedGraphIdlePerformanceSample {
  status: 'idle';
}

export type OwnedGraphPerformanceSample =
  | OwnedGraphActivePerformanceSample
  | OwnedGraphIdlePerformanceSample;

export interface OwnedGraphPerformanceMonitor {
  completeFrame(submissionId: number): OwnedGraphPerformanceSample | undefined;
  discardFrame(submissionId: number): OwnedGraphPerformanceSample | undefined;
  reset(): void;
  sample(): OwnedGraphPerformanceSample;
  setIdle(): OwnedGraphIdlePerformanceSample;
  stageFrame(submissionId: number, input: OwnedGraphFramePerformanceInput): void;
}

class RollingAverage {
  private sampleCount = 0;
  private nextIndex = 0;
  private readonly values = new Float64Array(SAMPLE_CAPACITY);

  get count(): number {
    return this.sampleCount;
  }

  add(value: number): void {
    this.values[this.nextIndex] = value;
    this.nextIndex = (this.nextIndex + 1) % SAMPLE_CAPACITY;
    this.sampleCount = Math.min(this.sampleCount + 1, SAMPLE_CAPACITY);
  }

  average(): number {
    let total = 0;
    for (let index = 0; index < this.sampleCount; index += 1) total += this.values[index];
    return total / this.sampleCount;
  }

  reset(): void {
    this.sampleCount = 0;
    this.nextIndex = 0;
  }
}

function validFrameInput(input: OwnedGraphFramePerformanceInput): boolean {
  return Number.isFinite(input.presentationTimestampMs)
    && Number.isFinite(input.renderMs)
    && input.renderMs >= 0
    && Number.isFinite(input.simulationMs)
    && input.simulationMs >= 0;
}

interface PendingPerformanceFrame {
  input: OwnedGraphFramePerformanceInput | undefined;
  succeeded?: boolean;
}

class OwnedGraphFpsMonitor implements OwnedGraphPerformanceMonitor {
  private readonly frameIntervals = new RollingAverage();
  private readonly frameWork = new RollingAverage();
  private lastFrameTimestamp: number | undefined;
  private lastPublishedAt = Number.NEGATIVE_INFINITY;
  private nextPendingSubmissionId: number | undefined;
  private readonly pendingFrames = new Map<number, PendingPerformanceFrame>();

  stageFrame(submissionId: number, input: OwnedGraphFramePerformanceInput): void {
    if (!Number.isSafeInteger(submissionId) || submissionId <= 0) return;
    this.pendingFrames.set(submissionId, {
      input: validFrameInput(input) ? input : undefined,
    });
    this.nextPendingSubmissionId ??= submissionId;
  }

  completeFrame(submissionId: number): OwnedGraphPerformanceSample | undefined {
    return this.settleFrame(submissionId, true);
  }

  discardFrame(submissionId: number): OwnedGraphPerformanceSample | undefined {
    return this.settleFrame(submissionId, false);
  }

  reset(): void {
    this.frameIntervals.reset();
    this.frameWork.reset();
    this.lastFrameTimestamp = undefined;
    this.lastPublishedAt = Number.NEGATIVE_INFINITY;
    this.nextPendingSubmissionId = undefined;
    this.pendingFrames.clear();
  }

  sample(): OwnedGraphPerformanceSample {
    if (this.frameIntervals.count === 0) return { status: 'idle' };
    return {
      status: 'active',
      frameTimeMs: this.frameWork.average(),
      renderedFps: 1_000 / this.frameIntervals.average(),
      sampleCount: this.frameWork.count,
    };
  }

  setIdle(): OwnedGraphIdlePerformanceSample {
    this.reset();
    return { status: 'idle' };
  }

  private settleFrame(
    submissionId: number,
    succeeded: boolean,
  ): OwnedGraphPerformanceSample | undefined {
    const pending = this.pendingFrames.get(submissionId);
    if (!pending) return undefined;
    pending.succeeded = succeeded;
    return this.consumeSettledFrames();
  }

  private consumeSettledFrames(): OwnedGraphPerformanceSample | undefined {
    let published: OwnedGraphPerformanceSample | undefined;
    while (this.nextPendingSubmissionId !== undefined) {
      const submissionId = this.nextPendingSubmissionId;
      const pending = this.pendingFrames.get(submissionId);
      if (!pending || pending.succeeded === undefined) break;
      this.pendingFrames.delete(submissionId);
      this.nextPendingSubmissionId = this.pendingFrames.size > 0
        ? submissionId + 1
        : undefined;
      if (pending.succeeded && pending.input) {
        published = this.recordCompletedFrame(pending.input) ?? published;
      }
    }
    return published;
  }

  private recordCompletedFrame(
    input: OwnedGraphFramePerformanceInput,
  ): OwnedGraphPerformanceSample | undefined {
    const previousTimestamp = this.lastFrameTimestamp;
    if (previousTimestamp !== undefined) {
      const interval = input.presentationTimestampMs - previousTimestamp;
      if (!Number.isFinite(interval) || interval <= 0) return undefined;
      this.frameIntervals.add(interval);
    }
    this.lastFrameTimestamp = input.presentationTimestampMs;
    this.frameWork.add(input.renderMs + input.simulationMs);
    if (this.frameIntervals.count === 0
      || input.presentationTimestampMs - this.lastPublishedAt < PUBLICATION_INTERVAL_MS) {
      return undefined;
    }
    this.lastPublishedAt = input.presentationTimestampMs;
    return this.sample();
  }
}

export function createOwnedGraphPerformanceMonitor(): OwnedGraphPerformanceMonitor {
  return new OwnedGraphFpsMonitor();
}

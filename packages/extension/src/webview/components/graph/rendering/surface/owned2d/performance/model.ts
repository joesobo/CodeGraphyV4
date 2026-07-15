import {
  summarizePerformanceDistribution,
  type OwnedGraphPerformanceDistribution,
} from './distribution';

export type { OwnedGraphPerformanceDistribution } from './distribution';

const DEFAULT_SAMPLE_CAPACITY = 256;
const DEFAULT_PUBLICATION_INTERVAL_MS = 500;

export interface OwnedGraphFramePerformanceInput {
  presentationTimestampMs: number;
  renderMs: number;
  simulationMs: number;
}

export interface OwnedGraphActivePerformanceSample {
  status: 'active';
  displayedFps: number | null;
  frameTimeMs: OwnedGraphPerformanceDistribution;
  potentialFps: number;
  renderTimeMs: OwnedGraphPerformanceDistribution;
  sampleCount: number;
  simulationTimeMs: OwnedGraphPerformanceDistribution;
}

export interface OwnedGraphIdlePerformanceSample {
  status: 'idle';
  lastActive?: OwnedGraphActivePerformanceSample;
}

export type OwnedGraphPerformanceSample =
  | OwnedGraphActivePerformanceSample
  | OwnedGraphIdlePerformanceSample;

export interface OwnedGraphPerformanceMonitorOptions {
  capacity?: number;
  publicationIntervalMs?: number;
}

export interface OwnedGraphPerformanceMonitor {
  recordFrame(input: OwnedGraphFramePerformanceInput): OwnedGraphPerformanceSample | undefined;
  reset(): void;
  sample(): OwnedGraphPerformanceSample;
  setIdle(): OwnedGraphIdlePerformanceSample;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : fallback;
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validFrameInput(input: OwnedGraphFramePerformanceInput): boolean {
  const totalMs = input.renderMs + input.simulationMs;
  return Number.isFinite(input.presentationTimestampMs)
    && finiteNonNegative(input.renderMs)
    && finiteNonNegative(input.simulationMs)
    && Number.isFinite(totalMs)
    && totalMs > 0;
}

class BoundedOwnedGraphPerformanceMonitor implements OwnedGraphPerformanceMonitor {
  private active = false;
  private count = 0;
  private readonly capacity: number;
  private lastActive: OwnedGraphActivePerformanceSample | undefined;
  private lastPublicationSampleCount = 0;
  private lastPublicationTimestamp: number | null = null;
  private nextIndex = 0;
  private readonly presentationTimestamps: Float64Array;
  private readonly publicationIntervalMs: number;
  private readonly renderDurations: Float64Array;
  private readonly simulationDurations: Float64Array;
  private readonly totalDurations: Float64Array;

  constructor(options: OwnedGraphPerformanceMonitorOptions) {
    this.capacity = positiveInteger(options.capacity, DEFAULT_SAMPLE_CAPACITY);
    this.publicationIntervalMs = finiteNonNegative(
      options.publicationIntervalMs ?? Number.NaN,
    )
      ? options.publicationIntervalMs as number
      : DEFAULT_PUBLICATION_INTERVAL_MS;
    this.presentationTimestamps = new Float64Array(this.capacity);
    this.renderDurations = new Float64Array(this.capacity);
    this.simulationDurations = new Float64Array(this.capacity);
    this.totalDurations = new Float64Array(this.capacity);
  }

  recordFrame(
    input: OwnedGraphFramePerformanceInput,
  ): OwnedGraphPerformanceSample | undefined {
    if (!validFrameInput(input) || !this.acceptsTimestamp(input.presentationTimestampMs)) {
      return undefined;
    }
    this.activateWindow();
    this.appendFrame(input);
    if (!this.shouldPublish(input.presentationTimestampMs)) return undefined;
    return this.publish(input.presentationTimestampMs);
  }

  reset(): void {
    this.active = false;
    this.clearWindow();
    this.lastActive = undefined;
  }

  sample(): OwnedGraphPerformanceSample {
    return !this.active || this.count === 0
      ? this.idleSample()
      : this.activeSample();
  }

  setIdle(): OwnedGraphIdlePerformanceSample {
    if (this.shouldCaptureFinalSample()) this.lastActive = this.activeSample();
    this.active = false;
    this.clearWindow();
    return this.idleSample();
  }

  private acceptsTimestamp(timestamp: number): boolean {
    return !this.active
      || this.count === 0
      || timestamp > this.presentationTimestamps[this.latestIndex()];
  }

  private activateWindow(): void {
    if (this.active) return;
    this.clearWindow();
    this.active = true;
  }

  private activeSample(): OwnedGraphActivePerformanceSample {
    const frameTimeMs = summarizePerformanceDistribution(
      this.orderedValues(this.totalDurations),
    );
    return {
      status: 'active',
      displayedFps: this.displayedFps(),
      frameTimeMs,
      potentialFps: 1_000 / frameTimeMs.average,
      renderTimeMs: summarizePerformanceDistribution(
        this.orderedValues(this.renderDurations),
      ),
      sampleCount: this.count,
      simulationTimeMs: summarizePerformanceDistribution(
        this.orderedValues(this.simulationDurations),
      ),
    };
  }

  private appendFrame(input: OwnedGraphFramePerformanceInput): void {
    this.presentationTimestamps[this.nextIndex] = input.presentationTimestampMs;
    this.renderDurations[this.nextIndex] = input.renderMs;
    this.simulationDurations[this.nextIndex] = input.simulationMs;
    this.totalDurations[this.nextIndex] = input.renderMs + input.simulationMs;
    this.nextIndex = (this.nextIndex + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
  }

  private clearWindow(): void {
    this.count = 0;
    this.nextIndex = 0;
    this.lastPublicationSampleCount = 0;
    this.lastPublicationTimestamp = null;
  }

  private displayedFps(): number | null {
    if (this.count < 2) return null;
    const elapsedMs = this.presentationTimestamps[this.latestIndex()]
      - this.presentationTimestamps[this.oldestIndex()];
    return elapsedMs > 0 ? ((this.count - 1) * 1_000) / elapsedMs : null;
  }

  private idleSample(): OwnedGraphIdlePerformanceSample {
    return this.lastActive
      ? { status: 'idle', lastActive: this.lastActive }
      : { status: 'idle' };
  }

  private latestIndex(): number {
    return (this.nextIndex + this.capacity - 1) % this.capacity;
  }

  private oldestIndex(): number {
    return this.count === this.capacity ? this.nextIndex : 0;
  }

  private orderedValues(buffer: Float64Array): number[] {
    const values = new Array<number>(this.count);
    const oldest = this.oldestIndex();
    for (let offset = 0; offset < this.count; offset += 1) {
      values[offset] = buffer[(oldest + offset) % this.capacity];
    }
    return values;
  }

  private publish(timestamp: number): OwnedGraphActivePerformanceSample {
    this.lastPublicationSampleCount = this.count;
    this.lastPublicationTimestamp = timestamp;
    this.lastActive = this.activeSample();
    return this.lastActive;
  }

  private shouldCaptureFinalSample(): boolean {
    return this.active
      && this.count > 0
      && (this.count > 1 || this.lastActive === undefined);
  }

  private shouldPublish(timestamp: number): boolean {
    if (this.count === 1 && this.lastActive !== undefined) return false;
    if (this.lastPublicationSampleCount < 2 && this.count >= 2) return true;
    return this.lastPublicationTimestamp === null
      || timestamp - this.lastPublicationTimestamp >= this.publicationIntervalMs;
  }
}

export function createOwnedGraphPerformanceMonitor(
  options: OwnedGraphPerformanceMonitorOptions = {},
): OwnedGraphPerformanceMonitor {
  return new BoundedOwnedGraphPerformanceMonitor(options);
}

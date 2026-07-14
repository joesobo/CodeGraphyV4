const DEFAULT_SAMPLE_CAPACITY = 256;
const DEFAULT_PUBLICATION_INTERVAL_MS = 500;

export interface OwnedGraphFramePerformanceInput {
  presentationTimestampMs: number;
  renderMs: number;
  simulationMs: number;
}

export interface OwnedGraphPerformanceDistribution {
  average: number;
  maximum: number;
  onePercentHigh: number;
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

function distribution(values: readonly number[]): OwnedGraphPerformanceDistribution {
  let sum = 0;
  let maximum = 0;
  for (const value of values) {
    sum += value;
    maximum = Math.max(maximum, value);
  }
  const sortedDescending = [...values].sort((first, second) => second - first);
  const highCount = Math.max(1, Math.ceil(sortedDescending.length / 100));
  let highSum = 0;
  for (let index = 0; index < highCount; index += 1) {
    highSum += sortedDescending[index];
  }
  return {
    average: sum / values.length,
    maximum,
    onePercentHigh: highSum / highCount,
  };
}

export function createOwnedGraphPerformanceMonitor(
  options: OwnedGraphPerformanceMonitorOptions = {},
): OwnedGraphPerformanceMonitor {
  const capacity = positiveInteger(options.capacity, DEFAULT_SAMPLE_CAPACITY);
  const publicationIntervalMs = finiteNonNegative(options.publicationIntervalMs ?? Number.NaN)
    ? options.publicationIntervalMs as number
    : DEFAULT_PUBLICATION_INTERVAL_MS;
  const presentationTimestamps = new Float64Array(capacity);
  const renderDurations = new Float64Array(capacity);
  const simulationDurations = new Float64Array(capacity);
  const totalDurations = new Float64Array(capacity);
  let active = false;
  let count = 0;
  let nextIndex = 0;
  let lastActive: OwnedGraphActivePerformanceSample | undefined;
  let lastPublicationSampleCount = 0;
  let lastPublicationTimestamp: number | null = null;

  function clearWindow(): void {
    count = 0;
    nextIndex = 0;
    lastPublicationSampleCount = 0;
    lastPublicationTimestamp = null;
  }

  function orderedValues(buffer: Float64Array): number[] {
    const values = new Array<number>(count);
    const oldest = count === capacity ? nextIndex : 0;
    for (let offset = 0; offset < count; offset += 1) {
      values[offset] = buffer[(oldest + offset) % capacity];
    }
    return values;
  }

  function activeSample(): OwnedGraphActivePerformanceSample {
    const timestamps = orderedValues(presentationTimestamps);
    const render = orderedValues(renderDurations);
    const simulation = orderedValues(simulationDurations);
    const total = orderedValues(totalDurations);
    const frameTimeMs = distribution(total);
    const elapsedMs = timestamps.length > 1
      ? timestamps[timestamps.length - 1] - timestamps[0]
      : 0;
    const displayedFps = elapsedMs > 0
      ? ((timestamps.length - 1) * 1_000) / elapsedMs
      : null;
    return {
      status: 'active',
      displayedFps,
      frameTimeMs,
      potentialFps: 1_000 / frameTimeMs.average,
      renderTimeMs: distribution(render),
      sampleCount: count,
      simulationTimeMs: distribution(simulation),
    };
  }

  function addFrame(input: OwnedGraphFramePerformanceInput): void {
    presentationTimestamps[nextIndex] = input.presentationTimestampMs;
    renderDurations[nextIndex] = input.renderMs;
    simulationDurations[nextIndex] = input.simulationMs;
    totalDurations[nextIndex] = input.renderMs + input.simulationMs;
    nextIndex = (nextIndex + 1) % capacity;
    count = Math.min(capacity, count + 1);
  }

  return {
    recordFrame: (input) => {
      const totalMs = input.renderMs + input.simulationMs;
      if (
        !Number.isFinite(input.presentationTimestampMs)
        || !finiteNonNegative(input.renderMs)
        || !finiteNonNegative(input.simulationMs)
        || !Number.isFinite(totalMs)
        || totalMs <= 0
      ) return undefined;
      if (active && count > 0) {
        const timestamps = orderedValues(presentationTimestamps);
        if (input.presentationTimestampMs <= timestamps[timestamps.length - 1]) return undefined;
      }
      if (!active) {
        clearWindow();
        active = true;
      }
      addFrame(input);
      if (count === 1 && lastActive !== undefined) return undefined;
      const firstDisplayedCadenceIsReady = lastPublicationSampleCount < 2 && count >= 2;
      if (
        !firstDisplayedCadenceIsReady
        && lastPublicationTimestamp !== null
        && input.presentationTimestampMs - lastPublicationTimestamp < publicationIntervalMs
      ) return undefined;
      lastPublicationSampleCount = count;
      lastPublicationTimestamp = input.presentationTimestampMs;
      lastActive = activeSample();
      return lastActive;
    },
    reset: () => {
      active = false;
      clearWindow();
      lastActive = undefined;
    },
    sample: () => {
      if (!active || count === 0) {
        return lastActive ? { status: 'idle', lastActive } : { status: 'idle' };
      }
      return activeSample();
    },
    setIdle: () => {
      if (active && count > 0 && (count > 1 || lastActive === undefined)) {
        lastActive = activeSample();
      }
      active = false;
      clearWindow();
      return lastActive ? { status: 'idle', lastActive } : { status: 'idle' };
    },
  };
}

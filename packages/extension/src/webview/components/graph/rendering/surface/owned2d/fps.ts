const IDLE_RESET_MS = 1_000;
const PUBLICATION_INTERVAL_MS = 500;
const SAMPLE_CAPACITY = 256;

export interface RenderedFrameFpsSample {
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly onePercentLowFps: number;
}

export interface RenderedFrameFpsSampler {
  readonly fps: number | null;
  readonly frameTimeMs: number | null;
  record(timestamp: number): RenderedFrameFpsSample | undefined;
  sample(): RenderedFrameFpsSample | null;
  reset(): void;
}

export function createRenderedFrameFpsSampler(): RenderedFrameFpsSampler {
  const frameDurationsMs = new Float64Array(SAMPLE_CAPACITY);
  let sampleCount = 0;
  let nextSampleIndex = 0;
  let durationSumMs = 0;
  let fpsSum = 0;
  let lastPublicationTimestamp: number | null = null;
  let previousTimestamp: number | null = null;

  function clearSamples(): void {
    sampleCount = 0;
    nextSampleIndex = 0;
    durationSumMs = 0;
    fpsSum = 0;
  }

  function addSample(frameDurationMs: number): void {
    if (sampleCount === SAMPLE_CAPACITY) {
      const evicted = frameDurationsMs[nextSampleIndex];
      durationSumMs -= evicted;
      fpsSum -= 1_000 / evicted;
    } else {
      sampleCount += 1;
    }
    frameDurationsMs[nextSampleIndex] = frameDurationMs;
    durationSumMs += frameDurationMs;
    fpsSum += 1_000 / frameDurationMs;
    nextSampleIndex = (nextSampleIndex + 1) % SAMPLE_CAPACITY;
  }

  function onePercentLowFps(): number {
    const sorted = [...frameDurationsMs.subarray(0, sampleCount)]
      .sort((first, second) => second - first);
    const lowSampleCount = Math.max(1, Math.floor(sampleCount / 100));
    let lowFpsSum = 0;
    for (let index = 0; index < lowSampleCount; index += 1) {
      lowFpsSum += 1_000 / sorted[index];
    }
    return lowFpsSum / lowSampleCount;
  }

  function currentSample(): RenderedFrameFpsSample | null {
    if (sampleCount === 0) return null;
    return {
      fps: fpsSum / sampleCount,
      frameTimeMs: durationSumMs / sampleCount,
      onePercentLowFps: onePercentLowFps(),
    };
  }

  return {
    get fps(): number | null {
      return sampleCount === 0 ? null : fpsSum / sampleCount;
    },
    get frameTimeMs(): number | null {
      return sampleCount === 0 ? null : durationSumMs / sampleCount;
    },
    record(timestamp: number): RenderedFrameFpsSample | undefined {
      if (!Number.isFinite(timestamp)) return undefined;
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
        return undefined;
      }

      const frameDurationMs = timestamp - previousTimestamp;
      if (frameDurationMs <= 0) return undefined;
      previousTimestamp = timestamp;
      if (frameDurationMs > IDLE_RESET_MS) {
        clearSamples();
        return undefined;
      }

      addSample(frameDurationMs);
      if (
        lastPublicationTimestamp !== null
        && timestamp - lastPublicationTimestamp < PUBLICATION_INTERVAL_MS
      ) {
        return undefined;
      }
      lastPublicationTimestamp = timestamp;
      return currentSample() ?? undefined;
    },
    sample(): RenderedFrameFpsSample | null {
      return currentSample();
    },
    reset(): void {
      clearSamples();
      lastPublicationTimestamp = null;
      previousTimestamp = null;
    },
  };
}

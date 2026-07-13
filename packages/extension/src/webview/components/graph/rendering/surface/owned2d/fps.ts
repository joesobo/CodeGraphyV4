const EMA_WEIGHT = 0.2;
const IDLE_RESET_MS = 1_000;
const PUBLICATION_INTERVAL_MS = 500;

export interface RenderedFrameFpsSampler {
  readonly fps: number | null;
  record(timestamp: number): number | undefined;
  reset(): void;
}

export function createRenderedFrameFpsSampler(): RenderedFrameFpsSampler {
  let averageFrameDurationMs: number | null = null;
  let currentFps: number | null = null;
  let lastPublicationTimestamp: number | null = null;
  let previousTimestamp: number | null = null;

  return {
    get fps(): number | null {
      return currentFps;
    },
    record(timestamp: number): number | undefined {
      if (!Number.isFinite(timestamp)) return undefined;
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
        return undefined;
      }

      const frameDurationMs = timestamp - previousTimestamp;
      if (frameDurationMs <= 0) return undefined;
      previousTimestamp = timestamp;
      if (frameDurationMs > IDLE_RESET_MS) {
        averageFrameDurationMs = null;
        return undefined;
      }

      averageFrameDurationMs = averageFrameDurationMs === null
        ? frameDurationMs
        : averageFrameDurationMs + EMA_WEIGHT * (frameDurationMs - averageFrameDurationMs);
      currentFps = 1_000 / averageFrameDurationMs;

      if (
        lastPublicationTimestamp !== null
        && timestamp - lastPublicationTimestamp < PUBLICATION_INTERVAL_MS
      ) {
        return undefined;
      }
      lastPublicationTimestamp = timestamp;
      return currentFps;
    },
    reset(): void {
      averageFrameDurationMs = null;
      currentFps = null;
      lastPublicationTimestamp = null;
      previousTimestamp = null;
    },
  };
}

import type {
  PerfEventInput,
  PerfOperation,
} from '../../shared/perf/protocol';
import { webviewPerfBridge } from './bridge';

export interface FrameLongTaskObserver {
  disconnect: () => void;
  takeRecords: () => PerformanceEntry[];
}

type FpsMetric = 'fpsIdle' | 'fpsDrag' | 'fpsSettle';
const idleFpsProbeDurationMs = 1_000;

interface FrameMetricBridge {
  emitFor: (operation: PerfOperation, event: PerfEventInput) => boolean;
}

interface FrameMetricsDependencies {
  bridge: FrameMetricBridge;
  cancelFrame: (frame: number) => void;
  createLongTaskObserver: (
    reportEntries: (count: number) => void,
  ) => FrameLongTaskObserver | undefined;
  now: () => number;
  readHeapUsedBytes: () => number | undefined;
  requestFrame: (callback: FrameRequestCallback) => number;
}

export interface FrameMetrics {
  cancel: () => void;
  completeIdle: (operation: PerfOperation) => void;
  completeInteraction: (operation: PerfOperation) => void;
  startIdle: (operation: PerfOperation) => void;
  startInteraction: (operation: PerfOperation) => void;
  startSettle: (operation: PerfOperation) => void;
}

interface ActiveFpsWindow {
  frame: number;
  frames: number;
  metric: FpsMetric;
  operation: PerfOperation;
  startedAt: number;
}

type ActiveSample =
  | { kind: 'idle'; operation: PerfOperation }
  | { kind: 'interaction'; operation: PerfOperation };

function createBrowserLongTaskObserver(
  reportEntries: (count: number) => void,
): FrameLongTaskObserver | undefined {
  const Observer = globalThis.PerformanceObserver;
  if (
    typeof Observer !== 'function'
    || !Observer.supportedEntryTypes?.includes('longtask')
  ) {
    return undefined;
  }

  let observer: PerformanceObserver | undefined;
  try {
    observer = new Observer((entries) => {
      reportEntries(entries.getEntries().length);
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    observer?.disconnect();
    return undefined;
  }

  return {
    disconnect: () => observer.disconnect(),
    takeRecords: () => observer.takeRecords(),
  };
}

function readChromiumHeapUsedBytes(): number | undefined {
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize?: unknown };
  }).memory;
  const value = memory?.usedJSHeapSize;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

const defaultDependencies: FrameMetricsDependencies = {
  bridge: webviewPerfBridge,
  cancelFrame: frame => cancelAnimationFrame(frame),
  createLongTaskObserver: createBrowserLongTaskObserver,
  now: () => performance.now(),
  readHeapUsedBytes: readChromiumHeapUsedBytes,
  requestFrame: callback => requestAnimationFrame(callback),
};

export function createFrameMetrics(
  dependencies: FrameMetricsDependencies = defaultDependencies,
): FrameMetrics {
  let activeSample: ActiveSample | undefined;
  let fpsWindow: ActiveFpsWindow | undefined;
  let idleFpsTimer: ReturnType<typeof setTimeout> | undefined;
  let longTaskCount = 0;
  let longTaskObserver: FrameLongTaskObserver | undefined;

  const cancelIdleFpsTimer = (): void => {
    if (idleFpsTimer !== undefined) {
      clearTimeout(idleFpsTimer);
      idleFpsTimer = undefined;
    }
  };

  const cancelFpsWindow = (): void => {
    cancelIdleFpsTimer();
    if (!fpsWindow) {
      return;
    }
    dependencies.cancelFrame(fpsWindow.frame);
    fpsWindow = undefined;
  };

  const disconnectLongTaskObserver = (): void => {
    longTaskObserver?.disconnect();
    longTaskObserver = undefined;
    longTaskCount = 0;
  };

  const cancel = (): void => {
    cancelFpsWindow();
    disconnectLongTaskObserver();
    activeSample = undefined;
  };

  const startFpsWindow = (operation: PerfOperation, metric: FpsMetric): void => {
    cancelFpsWindow();
    const window: ActiveFpsWindow = {
      frame: 0,
      frames: 0,
      metric,
      operation,
      startedAt: dependencies.now(),
    };
    const tick = (): void => {
      if (fpsWindow !== window) {
        return;
      }
      window.frames += 1;
      window.frame = dependencies.requestFrame(tick);
    };
    window.frame = dependencies.requestFrame(tick);
    fpsWindow = window;
  };

  const completeFpsWindow = (
    operation: PerfOperation,
    metric: FpsMetric,
  ): void => {
    const window = fpsWindow;
    if (
      !window
      || window.operation !== operation
      || window.metric !== metric
    ) {
      return;
    }

    const durationMs = dependencies.now() - window.startedAt;
    dependencies.cancelFrame(window.frame);
    fpsWindow = undefined;
    if (durationMs <= 0 || window.frames === 0) {
      return;
    }

    dependencies.bridge.emitFor(operation, {
      kind: 'metric',
      metric,
      unit: 'fps',
      value: (window.frames * 1_000) / durationMs,
    });
  };

  return {
    cancel,

    completeIdle(operation): void {
      if (activeSample?.kind !== 'idle' || activeSample.operation !== operation) {
        return;
      }

      cancelIdleFpsTimer();
      completeFpsWindow(operation, 'fpsIdle');
      const heapUsedBytes = dependencies.readHeapUsedBytes();
      if (heapUsedBytes !== undefined) {
        dependencies.bridge.emitFor(operation, {
          kind: 'metric',
          metric: 'heapUsedBytes',
          unit: 'bytes',
          value: heapUsedBytes,
        });
      }
      activeSample = undefined;
    },

    completeInteraction(operation): void {
      if (
        activeSample?.kind !== 'interaction'
        || activeSample.operation !== operation
      ) {
        return;
      }

      if (fpsWindow?.metric === 'fpsDrag') {
        completeFpsWindow(operation, 'fpsDrag');
      } else {
        completeFpsWindow(operation, 'fpsSettle');
      }

      const observer = longTaskObserver;
      if (observer) {
        longTaskCount += observer.takeRecords().length;
        observer.disconnect();
        longTaskObserver = undefined;
        dependencies.bridge.emitFor(operation, {
          kind: 'metric',
          metric: 'longTasksPerInteraction',
          unit: 'count',
          value: longTaskCount,
        });
      }
      longTaskCount = 0;
      activeSample = undefined;
    },

    startIdle(operation): void {
      cancel();
      activeSample = { kind: 'idle', operation };
      startFpsWindow(operation, 'fpsIdle');
      idleFpsTimer = setTimeout(() => {
        idleFpsTimer = undefined;
        completeFpsWindow(operation, 'fpsIdle');
      }, idleFpsProbeDurationMs);
    },

    startInteraction(operation): void {
      cancel();
      const sample: ActiveSample = { kind: 'interaction', operation };
      activeSample = sample;
      longTaskObserver = dependencies.createLongTaskObserver((count) => {
        if (activeSample === sample) {
          longTaskCount += count;
        }
      });
      startFpsWindow(operation, 'fpsDrag');
    },

    startSettle(operation): void {
      if (
        activeSample?.kind !== 'interaction'
        || activeSample.operation !== operation
      ) {
        return;
      }
      completeFpsWindow(operation, 'fpsDrag');
      startFpsWindow(operation, 'fpsSettle');
    },
  };
}

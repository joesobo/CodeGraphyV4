import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PerfOperation } from '../../../src/shared/perf/protocol';
import {
  createFrameMetrics,
  type FrameLongTaskObserver,
} from '../../../src/webview/perf/frameMetrics';

const interactionOperation: PerfOperation = {
  dimension: 'large',
  operationId: 'interaction-1',
  runId: 'run-1',
  scenario: 'interaction-burst',
};

const idleOperation: PerfOperation = {
  dimension: 'large',
  operationId: 'idle-1',
  runId: 'run-1',
  scenario: 'idle-watch',
};

function setup(options: {
  heapUsedBytes?: number;
  longTasksSupported?: boolean;
} = {}) {
  let now = 0;
  let nextFrame = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const emitFor = vi.fn(() => true);
  const disconnect = vi.fn();
  const takeRecords = vi.fn(() => [] as PerformanceEntry[]);
  let reportLongTasks: ((count: number) => void) | undefined;
  const observer: FrameLongTaskObserver = { disconnect, takeRecords };
  const createLongTaskObserver = vi.fn((report: (count: number) => void) => {
    reportLongTasks = report;
    return options.longTasksSupported === false ? undefined : observer;
  });
  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    const frame = nextFrame;
    nextFrame += 1;
    frames.set(frame, callback);
    return frame;
  });
  const cancelFrame = vi.fn((frame: number) => {
    frames.delete(frame);
  });
  const metrics = createFrameMetrics({
    bridge: { emitFor },
    cancelFrame,
    createLongTaskObserver,
    now: () => now,
    readHeapUsedBytes: () => options.heapUsedBytes,
    requestFrame,
  });

  return {
    cancelFrame,
    createLongTaskObserver,
    disconnect,
    emitFor,
    frames,
    metrics,
    reportLongTasks: (count: number) => reportLongTasks?.(count),
    requestFrame,
    setNow: (value: number) => { now = value; },
    takeRecords,
  };
}

function runNextFrame(frames: Map<number, FrameRequestCallback>, timestamp: number): void {
  const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
  if (!entry) throw new Error('Expected a queued frame');
  frames.delete(entry[0]);
  entry[1](timestamp);
}

describe('webview/perf/frameMetrics', () => {
  afterEach(() => vi.useRealTimers());

  it('allocates no observer or animation frame before an explicit sample starts', () => {
    const { createLongTaskObserver, requestFrame } = setup();

    expect(createLongTaskObserver).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('records real drag and settle frame rates for the exact interaction operation', () => {
    const { emitFor, frames, metrics, setNow } = setup();
    metrics.startInteraction(interactionOperation);
    runNextFrame(frames, 16);
    runNextFrame(frames, 32);
    setNow(40);

    metrics.startSettle(interactionOperation);
    runNextFrame(frames, 56);
    runNextFrame(frames, 72);
    runNextFrame(frames, 88);
    setNow(90);
    metrics.completeInteraction(interactionOperation);

    expect(emitFor).toHaveBeenCalledWith(interactionOperation, {
      kind: 'metric',
      metric: 'fpsDrag',
      unit: 'fps',
      value: 50,
    });
    expect(emitFor).toHaveBeenCalledWith(interactionOperation, {
      kind: 'metric',
      metric: 'fpsSettle',
      unit: 'fps',
      value: 60,
    });
  });

  it('counts delivered and buffered long tasks for one interaction', () => {
    const { emitFor, metrics, reportLongTasks, takeRecords } = setup();
    takeRecords.mockReturnValue([
      { entryType: 'longtask' },
    ] as PerformanceEntry[]);
    metrics.startInteraction(interactionOperation);
    reportLongTasks(2);

    metrics.completeInteraction(interactionOperation);

    expect(emitFor).toHaveBeenCalledWith(interactionOperation, {
      kind: 'metric',
      metric: 'longTasksPerInteraction',
      unit: 'count',
      value: 3,
    });
  });

  it('records idle FPS and Chromium heap at idle completion', () => {
    const { emitFor, frames, metrics, setNow } = setup({ heapUsedBytes: 1_048_576 });
    metrics.startIdle(idleOperation);
    runNextFrame(frames, 16);
    runNextFrame(frames, 32);
    runNextFrame(frames, 48);
    setNow(50);

    metrics.completeIdle(idleOperation);

    expect(emitFor).toHaveBeenCalledWith(idleOperation, {
      kind: 'metric',
      metric: 'fpsIdle',
      unit: 'fps',
      value: 60,
    });
    expect(emitFor).toHaveBeenCalledWith(idleOperation, {
      kind: 'metric',
      metric: 'heapUsedBytes',
      unit: 'bytes',
      value: 1_048_576,
    });
  });

  it('bounds the idle FPS probe instead of driving frames for the full CPU window', () => {
    vi.useFakeTimers();
    const { emitFor, frames, metrics, setNow } = setup();
    metrics.startIdle(idleOperation);
    runNextFrame(frames, 16);
    runNextFrame(frames, 32);
    runNextFrame(frames, 48);
    setNow(1_000);

    vi.advanceTimersByTime(1_000);

    expect(emitFor).toHaveBeenCalledWith(idleOperation, {
      kind: 'metric',
      metric: 'fpsIdle',
      unit: 'fps',
      value: 3,
    });
    expect(frames.size).toBe(0);
  });

  it('does not fabricate a long-task metric when the API is unsupported', () => {
    const { emitFor, metrics } = setup({ longTasksSupported: false });
    metrics.startInteraction(interactionOperation);

    metrics.completeInteraction(interactionOperation);

    expect(emitFor).not.toHaveBeenCalledWith(
      interactionOperation,
      expect.objectContaining({ metric: 'longTasksPerInteraction' }),
    );
  });

  it('does not fabricate a heap metric when Chromium heap data is unavailable', () => {
    const { emitFor, metrics } = setup();
    metrics.startIdle(idleOperation);

    metrics.completeIdle(idleOperation);

    expect(emitFor).not.toHaveBeenCalledWith(
      idleOperation,
      expect.objectContaining({ metric: 'heapUsedBytes' }),
    );
  });

  it('cancels frames and observers without emitting partial samples', () => {
    const { cancelFrame, disconnect, emitFor, metrics } = setup();
    metrics.startInteraction(interactionOperation);

    metrics.cancel();

    expect(cancelFrame).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(emitFor).not.toHaveBeenCalled();
  });

  it('does not complete a sample for a replacement operation object', () => {
    const { emitFor, metrics } = setup();
    metrics.startIdle(idleOperation);

    metrics.completeIdle({ ...idleOperation });

    expect(emitFor).not.toHaveBeenCalled();
  });

  it('does not fabricate FPS when no animation frame was observed', () => {
    const { emitFor, metrics, setNow } = setup({ heapUsedBytes: 1 });
    metrics.startIdle(idleOperation);
    setNow(100);

    metrics.completeIdle(idleOperation);

    expect(emitFor).not.toHaveBeenCalledWith(
      idleOperation,
      expect.objectContaining({ metric: 'fpsIdle' }),
    );
  });
});

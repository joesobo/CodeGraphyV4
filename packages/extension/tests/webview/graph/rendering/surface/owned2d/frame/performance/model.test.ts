import { describe, expect, it } from 'vitest';
import {
  createOwnedGraphPerformanceMonitor,
  type OwnedGraphPerformanceMonitor,
  type OwnedGraphPerformanceSample,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/performance/model';

const frame = (
  presentationTimestampMs: number,
  renderMs = 3,
  simulationMs = 2,
) => ({ presentationTimestampMs, renderMs, simulationMs });

let nextSubmissionId = 1;

function recordSuccessfulFrame(
  monitor: OwnedGraphPerformanceMonitor,
  input: ReturnType<typeof frame>,
): OwnedGraphPerformanceSample | undefined {
  const submissionId = nextSubmissionId;
  nextSubmissionId += 1;
  monitor.stageFrame(submissionId, input);
  return monitor.completeFrame(submissionId);
}

function recordAtRefreshRate(refreshRate: number): OwnedGraphPerformanceSample {
  const monitor = createOwnedGraphPerformanceMonitor();
  const intervalMs = 1_000 / refreshRate;
  for (let index = 0; index <= 120; index += 1) {
    recordSuccessfulFrame(monitor, frame(index * intervalMs));
  }
  return monitor.sample();
}

describe('owned graph FPS monitor', () => {
  it.each([60, 120, 144])('reports actual %i Hz rendered throughput from presentation intervals', refreshRate => {
    const sample = recordAtRefreshRate(refreshRate);

    expect(sample).toMatchObject({ status: 'active', sampleCount: 120 });
    if (sample.status === 'active') {
      expect(sample.renderedFps).toBeCloseTo(refreshRate, 8);
      expect(sample.frameTimeMs).toBe(5);
    }
  });

  it('keeps CPU frame cost separate from rendered FPS', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    recordSuccessfulFrame(monitor, frame(0, 3, 2));
    recordSuccessfulFrame(monitor, frame(20, 5, 3));

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 6.5,
      renderedFps: 50,
      sampleCount: 2,
    });
  });

  it('accounts for dropped and irregular frames', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    recordSuccessfulFrame(monitor, frame(0));
    recordSuccessfulFrame(monitor, frame(10));
    recordSuccessfulFrame(monitor, frame(50));

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 5,
      renderedFps: 40,
      sampleCount: 3,
    });
  });

  it('waits for two successful frames before publishing a finite FPS sample', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    expect(recordSuccessfulFrame(monitor, frame(0))).toBeUndefined();
    expect(monitor.sample()).toEqual({ status: 'idle' });
    expect(recordSuccessfulFrame(monitor, frame(20))).toMatchObject({
      status: 'active',
      renderedFps: 50,
      sampleCount: 2,
    });
  });

  it('does not count staged work that is rejected before successful completion', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.stageFrame(1, frame(0, 100, 100));
    monitor.discardFrame(1);
    recordSuccessfulFrame(monitor, frame(1_000, 3, 2));
    recordSuccessfulFrame(monitor, frame(1_020, 5, 3));

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 6.5,
      renderedFps: 50,
      sampleCount: 2,
    });
  });

  it('settles mixed submissions by identity without shifting FPS samples', () => {
    const monitor = createOwnedGraphPerformanceMonitor();
    monitor.stageFrame(10, frame(0, 100, 100));
    monitor.stageFrame(11, frame(20, 3, 2));
    monitor.stageFrame(12, frame(40, 5, 3));

    expect(monitor.completeFrame(12)).toBeUndefined();
    expect(monitor.completeFrame(11)).toBeUndefined();
    expect(monitor.discardFrame(10)).toMatchObject({ status: 'active' });

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 6.5,
      renderedFps: 50,
      sampleCount: 2,
    });
  });

  it('publishes active samples at most twice per second', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    recordSuccessfulFrame(monitor, frame(0));
    expect(recordSuccessfulFrame(monitor, frame(20))).toMatchObject({ status: 'active' });
    expect(recordSuccessfulFrame(monitor, frame(500))).toBeUndefined();
    expect(recordSuccessfulFrame(monitor, frame(520))).toMatchObject({ status: 'active', sampleCount: 4 });
  });

  it('accepts zero CPU cost because FPS no longer divides by CPU work', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    recordSuccessfulFrame(monitor, frame(0, 0, 0));
    recordSuccessfulFrame(monitor, frame(10, 0, 0));

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 0,
      renderedFps: 100,
      sampleCount: 2,
    });
  });

  it.each([
    frame(Number.NaN),
    frame(Number.POSITIVE_INFINITY),
    frame(0, -1, 2),
    frame(0, 1, -2),
    frame(0, Number.NaN, 1),
    frame(0, 1, Number.POSITIVE_INFINITY),
  ])('ignores invalid frame measurements without shifting the next interval', invalidFrame => {
    const monitor = createOwnedGraphPerformanceMonitor();

    expect(recordSuccessfulFrame(monitor, invalidFrame)).toBeUndefined();
    recordSuccessfulFrame(monitor, frame(100));
    recordSuccessfulFrame(monitor, frame(110));

    expect(monitor.sample()).toMatchObject({
      status: 'active',
      renderedFps: 100,
      sampleCount: 2,
    });
  });

  it('ignores duplicate and backwards presentation timestamps', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    recordSuccessfulFrame(monitor, frame(100));
    recordSuccessfulFrame(monitor, frame(100));
    recordSuccessfulFrame(monitor, frame(90));
    recordSuccessfulFrame(monitor, frame(110));

    expect(monitor.sample()).toMatchObject({
      status: 'active',
      renderedFps: 100,
      sampleCount: 2,
    });
  });

  it('clears presentation and CPU measurements when rendering becomes idle', () => {
    const monitor = createOwnedGraphPerformanceMonitor();
    recordSuccessfulFrame(monitor, frame(0));
    recordSuccessfulFrame(monitor, frame(20));

    expect(monitor.setIdle()).toEqual({ status: 'idle' });
    expect(monitor.sample()).toEqual({ status: 'idle' });
    expect(recordSuccessfulFrame(monitor, frame(1_000))).toBeUndefined();
    expect(monitor.sample()).toEqual({ status: 'idle' });
  });
});

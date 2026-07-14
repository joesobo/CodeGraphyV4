import { describe, expect, it } from 'vitest';
import { createOwnedGraphPerformanceMonitor } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/model';

describe('owned graph performance monitor', () => {
  it('separates CPU potential from displayed frame cadence', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 3, simulationMs: 2 });
    monitor.recordFrame({ presentationTimestampMs: 16, renderMs: 3, simulationMs: 2 });

    expect(monitor.sample()).toMatchObject({
      status: 'active',
      displayedFps: 62.5,
      potentialFps: 200,
      frameTimeMs: { average: 5, maximum: 5, onePercentHigh: 5 },
      renderTimeMs: { average: 3, maximum: 3, onePercentHigh: 3 },
      simulationTimeMs: { average: 2, maximum: 2, onePercentHigh: 2 },
    });
  });

  it('counts a dropped presentation against displayed FPS without changing potential FPS', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 2, simulationMs: 2 });
    monitor.recordFrame({ presentationTimestampMs: 10, renderMs: 2, simulationMs: 2 });
    monitor.recordFrame({ presentationTimestampMs: 30, renderMs: 2, simulationMs: 2 });

    const sample = monitor.sample();
    expect(sample.status).toBe('active');
    if (sample.status !== 'active') return;
    expect(sample.displayedFps).toBeCloseTo(66.666_666, 5);
    expect(sample.potentialFps).toBe(250);
  });

  it('reports average, maximum, and one-percent-high work over the rolling window', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    for (let index = 0; index < 99; index += 1) {
      monitor.recordFrame({ presentationTimestampMs: index * 10, renderMs: 4, simulationMs: 1 });
    }
    monitor.recordFrame({ presentationTimestampMs: 1_080, renderMs: 80, simulationMs: 20 });

    const sample = monitor.sample();
    expect(sample.status).toBe('active');
    if (sample.status !== 'active') return;
    expect(sample.frameTimeMs.average).toBeCloseTo(5.95, 8);
    expect(sample.frameTimeMs.maximum).toBe(100);
    expect(sample.frameTimeMs.onePercentHigh).toBe(100);
    expect(sample.renderTimeMs.onePercentHigh).toBe(80);
    expect(sample.simulationTimeMs.onePercentHigh).toBe(20);
  });

  it('uses an explicit idle state without discarding the last active sample', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 3, simulationMs: 2 });
    const idle = monitor.setIdle();

    expect(idle).toMatchObject({
      status: 'idle',
      lastActive: {
        status: 'active',
        potentialFps: 200,
      },
    });
    expect(monitor.sample()).toEqual(idle);
  });

  it('does not infer idle or erase an active stall from a long presentation gap', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 2, simulationMs: 1 });
    monitor.recordFrame({ presentationTimestampMs: 2_000, renderMs: 2, simulationMs: 1 });

    const sample = monitor.sample();
    expect(sample.status).toBe('active');
    if (sample.status !== 'active') return;
    expect(sample.displayedFps).toBe(0.5);
    expect(sample.sampleCount).toBe(2);
  });

  it('ignores invalid work samples instead of publishing non-finite values', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    expect(monitor.recordFrame({ presentationTimestampMs: 0, renderMs: Number.NaN, simulationMs: 1 }))
      .toBeUndefined();
    expect(monitor.recordFrame({ presentationTimestampMs: 1, renderMs: 0, simulationMs: 0 }))
      .toBeUndefined();
    expect(monitor.sample()).toEqual({ status: 'idle' });
  });

  it('drops the oldest work samples once the rolling window is full', () => {
    const monitor = createOwnedGraphPerformanceMonitor({ capacity: 3 });

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 9, simulationMs: 1 });
    monitor.recordFrame({ presentationTimestampMs: 10, renderMs: 1, simulationMs: 1 });
    monitor.recordFrame({ presentationTimestampMs: 20, renderMs: 1, simulationMs: 1 });
    monitor.recordFrame({ presentationTimestampMs: 30, renderMs: 1, simulationMs: 1 });

    const sample = monitor.sample();
    expect(sample.status).toBe('active');
    if (sample.status !== 'active') return;
    expect(sample.sampleCount).toBe(3);
    expect(sample.frameTimeMs.average).toBe(2);
    expect(sample.frameTimeMs.maximum).toBe(2);
    expect(sample.displayedFps).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import { createOwnedGraphPerformanceMonitor } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/model';

describe('owned graph FPS monitor', () => {
  it('reports the average frame work as FPS and milliseconds', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 3, simulationMs: 2 });
    monitor.recordFrame({ presentationTimestampMs: 20, renderMs: 5, simulationMs: 3 });

    expect(monitor.sample()).toEqual({
      status: 'active',
      frameTimeMs: 6.5,
      potentialFps: 1_000 / 6.5,
      sampleCount: 2,
    });
  });

  it('publishes at most twice per second', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    expect(monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 3, simulationMs: 2 }))
      .toMatchObject({ status: 'active' });
    expect(monitor.recordFrame({ presentationTimestampMs: 20, renderMs: 3, simulationMs: 2 }))
      .toBeUndefined();
    expect(monitor.recordFrame({ presentationTimestampMs: 500, renderMs: 3, simulationMs: 2 }))
      .toMatchObject({ status: 'active', sampleCount: 3 });
  });

  it('ignores invalid frame measurements', () => {
    const monitor = createOwnedGraphPerformanceMonitor();

    expect(monitor.recordFrame({ presentationTimestampMs: 0, renderMs: -2, simulationMs: 1 }))
      .toBeUndefined();
    expect(monitor.sample()).toEqual({ status: 'idle' });
  });

  it('clears measurements when rendering becomes idle', () => {
    const monitor = createOwnedGraphPerformanceMonitor();
    monitor.recordFrame({ presentationTimestampMs: 0, renderMs: 3, simulationMs: 2 });

    expect(monitor.setIdle()).toEqual({ status: 'idle' });
    expect(monitor.sample()).toEqual({ status: 'idle' });
  });
});

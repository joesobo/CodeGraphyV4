import { describe, expect, it, vi } from 'vitest';
import {
  completeOwnedGraphPerformanceFrame,
  formatOwnedGraphPerformance,
  publishOwnedGraphPerformance,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/performance/presentation';
import type { OwnedGraphActivePerformanceSample } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/performance/model';

const activeSample: OwnedGraphActivePerformanceSample = {
  status: 'active',
  frameTimeMs: 4.25,
  renderedFps: 59.94,
  sampleCount: 120,
};

describe('owned graph performance presentation', () => {
  it('labels rendered throughput as FPS and CPU work as milliseconds', () => {
    expect(formatOwnedGraphPerformance(activeSample)).toBe('60 FPS · 4.25 ms');
  });

  it('publishes rendered FPS diagnostics without describing them as potential throughput', () => {
    const output = document.createElement('output');

    publishOwnedGraphPerformance(activeSample, output);

    expect(output.dataset).toMatchObject({
      frameAverageMs: '4.25',
      performanceStatus: 'active',
      renderedFps: '59.94',
      sampleCount: '120',
    });
    expect(output.dataset.potentialFps).toBeUndefined();
    expect(output).toHaveTextContent('60 FPS · 4.25 ms');
  });

  it('publishes only successfully completed frame samples', () => {
    const output = document.createElement('output');
    const fpsRef = { current: null as number | null };
    const monitor = {
      completeFrame: vi.fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(activeSample),
      discardFrame: vi.fn(),
      reset: vi.fn(),
      sample: vi.fn(),
      setIdle: vi.fn(),
      stageFrame: vi.fn(),
    };

    completeOwnedGraphPerformanceFrame(monitor, 1, fpsRef, output);
    expect(output.textContent).toBe('');
    expect(fpsRef.current).toBeNull();

    completeOwnedGraphPerformanceFrame(monitor, 2, fpsRef, output);
    expect(output).toHaveTextContent('60 FPS · 4.25 ms');
    expect(fpsRef.current).toBe(59.94);
  });

  it('removes active diagnostics when the graph becomes idle', () => {
    const output = document.createElement('output');
    publishOwnedGraphPerformance(activeSample, output);

    publishOwnedGraphPerformance({ status: 'idle' }, output);

    expect(output.dataset).toEqual(expect.objectContaining({ performanceStatus: 'idle' }));
    expect(output.dataset.renderedFps).toBeUndefined();
    expect(output.dataset.frameAverageMs).toBeUndefined();
    expect(output.dataset.sampleCount).toBeUndefined();
    expect(output).toHaveTextContent('— FPS · — ms');
  });
});

import { describe, expect, it } from 'vitest';
import { createRenderedFrameFpsSampler } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/fps';

function recordSteadyFrames(
  sampler: ReturnType<typeof createRenderedFrameFpsSampler>,
  startTimestamp: number,
  frameDurationMs: number,
  count: number,
): void {
  for (let frame = 0; frame <= count; frame += 1) {
    sampler.record(startTimestamp + frame * frameDurationMs);
  }
}

describe('owned graph rendered-frame FPS sampler', () => {
  it('publishes FPS after two rendered frames', () => {
    const sampler = createRenderedFrameFpsSampler();

    expect(sampler.record(100)).toBeUndefined();
    expect(sampler.record(120)?.fps).toBe(50);
    expect(sampler.fps).toBe(50);
  });

  it('averages FPS over the sampled frame times, Graphy-style', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(0);
    sampler.record(20);
    sampler.record(60);

    // Mean of per-frame rates: (1000/20 + 1000/40) / 2 = 37.5 FPS.
    expect(sampler.fps).toBeCloseTo(37.5, 8);
    // Mean frame duration: (20 + 40) / 2 = 30ms.
    expect(sampler.frameTimeMs).toBeCloseTo(30, 8);
  });

  it('reports the one-percent-low FPS across the sample window', () => {
    const sampler = createRenderedFrameFpsSampler();

    // 99 frames at 10ms, one hitch at 100ms.
    recordSteadyFrames(sampler, 0, 10, 99);
    const published = sampler.record(990 + 100);

    expect(published?.onePercentLowFps).toBeCloseTo(10, 8);
    expect(published?.fps).toBeGreaterThan(90);
  });

  it('drops the oldest samples once the window is full', () => {
    const sampler = createRenderedFrameFpsSampler();

    // A slow stretch that a later fast stretch should fully evict.
    recordSteadyFrames(sampler, 0, 100, 10);
    recordSteadyFrames(sampler, 2_000, 10, 256);

    expect(sampler.fps).toBeCloseTo(100, 8);
    expect(sampler.frameTimeMs).toBeCloseTo(10, 8);
  });

  it('publishes no more than twice per second while continuing to sample', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(0);
    expect(sampler.record(20)?.fps).toBe(50);
    expect(sampler.record(40)).toBeUndefined();
    expect(sampler.record(500)).toBeUndefined();
    expect(sampler.record(520)?.fps).toBe(sampler.fps);
  });

  it('ignores invalid timestamps and starts a new sample after idle time', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(100);
    sampler.record(120);
    expect(sampler.record(Number.NaN)).toBeUndefined();
    expect(sampler.record(120)).toBeUndefined();
    expect(sampler.fps).toBe(50);
    expect(sampler.record(2_000)).toBeUndefined();
    expect(sampler.record(2_020)?.fps).toBe(50);
  });

  it('clears sampled FPS when reset', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(100);
    sampler.record(120);
    sampler.reset();

    expect(sampler.fps).toBeNull();
    expect(sampler.frameTimeMs).toBeNull();
    expect(sampler.record(140)).toBeUndefined();
  });
});

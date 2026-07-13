import { describe, expect, it } from 'vitest';
import { createRenderedFrameFpsSampler } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/fps';

describe('owned graph rendered-frame FPS sampler', () => {
  it('publishes FPS after two rendered frames', () => {
    const sampler = createRenderedFrameFpsSampler();

    expect(sampler.record(100)).toBeUndefined();
    expect(sampler.record(120)).toBe(50);
    expect(sampler.fps).toBe(50);
  });

  it('smooths frame duration with an exponential moving average', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(0);
    sampler.record(20);
    sampler.record(60);

    // EMA duration = 20 + 0.2 * (40 - 20) = 24ms.
    expect(sampler.fps).toBeCloseTo(1000 / 24, 8);
  });

  it('publishes no more than twice per second while continuing to sample', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(0);
    expect(sampler.record(20)).toBe(50);
    expect(sampler.record(40)).toBeUndefined();
    expect(sampler.record(500)).toBeUndefined();
    expect(sampler.record(520)).toBe(sampler.fps);
  });

  it('ignores invalid timestamps and starts a new sample after idle time', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(100);
    sampler.record(120);
    expect(sampler.record(Number.NaN)).toBeUndefined();
    expect(sampler.record(120)).toBeUndefined();
    expect(sampler.fps).toBe(50);
    expect(sampler.record(2_000)).toBeUndefined();
    expect(sampler.record(2_020)).toBe(50);
  });

  it('clears sampled FPS when reset', () => {
    const sampler = createRenderedFrameFpsSampler();

    sampler.record(100);
    sampler.record(120);
    sampler.reset();

    expect(sampler.fps).toBeNull();
    expect(sampler.record(140)).toBeUndefined();
  });
});

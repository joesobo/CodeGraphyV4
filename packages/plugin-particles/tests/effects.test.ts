// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLeavesEffect } from '../src/effects/presets/leaves';
import { createPerlinFlowEffect } from '../src/effects/presets/perlinFlow';
import { createRainEffect } from '../src/effects/presets/rain';
import { createSnowEffect } from '../src/effects/presets/snow';
import { rgba, type EffectRuntime } from '../src/effects/runtime';

const ROOT_PREWARM_SECONDS = 72;

describe('particle effect drawing', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves rgb ember colors when alpha is applied', () => {
    expect(rgba('rgb(201 169 90)', 0.5)).toBe('rgba(201,169,90,0.5)');
  });

  it('prewarms leaves across the background instead of clumping them at one spawn point', () => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
    const translatedXs: number[] = [];
    const translatedYs: number[] = [];
    const runtime = createRuntime({
      translate: (x: number, y: number) => {
        translatedXs.push(x);
        translatedYs.push(y);
      },
    });

    const effect = createLeavesEffect(runtime);
    prewarm(effect, runtime, ROOT_PREWARM_SECONDS);
    effect.draw(runtime);

    expect(coverageBands(translatedXs, runtime.width, 5)).toBeGreaterThanOrEqual(4);
    expect(coverageBands(translatedYs, runtime.height, 4)).toBeGreaterThanOrEqual(3);
    expect(Math.min(...translatedYs)).toBeLessThan(runtime.height * 0.25);
    expect(Math.max(...translatedYs)).toBeGreaterThan(runtime.height * 0.7);
  });

  it('starts snow near the top instead of prewarming it across the background', () => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
    const translatedYs: number[] = [];
    const runtime = createRuntime({
      translate: (_x: number, y: number) => {
        translatedYs.push(y);
      },
    });

    const effect = createSnowEffect(runtime);
    effect.step?.(runtime, 1 / 60);
    effect.draw(runtime);

    expect(Math.max(...translatedYs)).toBeLessThan(runtime.height * 0.2);
  });

  it('draws visible perlin flow particles without depending on dark background trails', () => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
    const radii: number[] = [];
    const alphas: number[] = [];
    const runtime = createRuntime({
      arc: (_x: number, _y: number, radius: number) => {
        radii.push(radius);
      },
    });
    Object.defineProperty(runtime.ctx, 'globalAlpha', {
      set(value: number) {
        alphas.push(value);
      },
    });

    const effect = createPerlinFlowEffect(runtime);
    prewarm(effect, runtime, ROOT_PREWARM_SECONDS);
    effect.draw(runtime);

    expect(Math.max(...radii)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...alphas)).toBeGreaterThan(0.08);
  });

  it('prewarms rain down the background instead of only spawning at the top edge', () => {
    let randomCalls = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      randomCalls += 1;
      return (randomCalls % 10) / 10;
    });
    const drawnYs: number[] = [];
    const runtime = createRuntime({
      lineTo: (_x: number, y: number) => {
        drawnYs.push(y);
      },
    });

    const effect = createRainEffect(runtime);
    prewarm(effect, runtime, ROOT_PREWARM_SECONDS);
    effect.draw(runtime);

    expect(Math.min(...drawnYs)).toBeLessThan(220);
    expect(Math.max(...drawnYs)).toBeGreaterThan(460);
  });

});

function prewarm(
  effect: { step?: (runtime: EffectRuntime, deltaSeconds: number) => void },
  runtime: EffectRuntime,
  seconds: number,
): void {
  const steps = 240;
  for (let step = 0; step < steps; step += 1) {
    effect.step?.(runtime, seconds / steps);
  }
}

function coverageBands(values: number[], max: number, bands: number): number {
  const covered = new Set<number>();
  for (const value of values) {
    if (value < 0 || value > max) {
      continue;
    }
    covered.add(Math.min(bands - 1, Math.floor((value / max) * bands)));
  }
  return covered.size;
}

function createSeededRandom(seed = 12345): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createRuntime(overrides: Partial<CanvasRenderingContext2D>): EffectRuntime {
  const ctx = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => createGradient()),
    createRadialGradient: vi.fn(() => createGradient()),
    fillRect: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    ...overrides,
  } as unknown as CanvasRenderingContext2D;

  return {
    backgroundColor: '#0b1020',
    canvas: {} as HTMLCanvasElement,
    color: '#8fcf6b',
    ctx,
    dpr: 1,
    height: 600,
    intensity: 1,
    size: 1,
    width: 1000,
  };
}

function createGradient(): CanvasGradient {
  return {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;
}

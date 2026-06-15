// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKGROUND_PARTICLE_PRESETS,
  startBackgroundParticleEffect,
  startCustomParticleEffect,
} from '../src/effects';
import { createLeavesEffect } from '../src/effects/leaves';
import { createPerlinFlowEffect } from '../src/effects/perlinFlow';
import { createRainEffect } from '../src/effects/rain';
import { createSnowEffect } from '../src/effects/snow';
import { rgba, type EffectRuntime } from '../src/effects/shared';

const ROOT_PREWARM_SECONDS = 72;

describe('particle effect drawing', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
    installBrowserMocks();
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

  it.each(BACKGROUND_PARTICLE_PRESETS)('starts and cleans up the %s preset through the root runtime', (preset) => {
    const { canvas, ctx } = createCanvasHarness();

    const cleanup = startBackgroundParticleEffect({
      canvas,
      preset,
      intensity: 1,
      color: preset === 'embers' ? '#f59e0b' : '#9cdef2',
      backgroundColor: '#0b1020',
      prewarmSeconds: 0.4,
      reduceMotion: true,
    });

    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(600);
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);

    cleanup();

    expect(ctx.clearRect).toHaveBeenLastCalledWith(0, 0, 1000, 600);
  });

  it('returns a no-op cleanup when a browser blocks canvas context access', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => startBackgroundParticleEffect({
      canvas,
      preset: 'rain',
      intensity: 1,
    })()).not.toThrow();
  });

  it('loads custom particle effects and disposes the returned cleanup', async () => {
    const { canvas } = createCanvasHarness();
    const cleanup = startCustomParticleEffect({
      canvas,
      intensity: 0.4,
      color: '#f59e0b',
      backgroundColor: '#0b1020',
      moduleUrl: createCustomEffectModuleUrl(`
        export function activateParticleEffect({ canvas, intensity, color }) {
          canvas.dataset.customIntensity = String(intensity);
          canvas.dataset.customColor = color;
          return () => {
            canvas.dataset.customCleaned = 'true';
          };
        }
      `),
    });

    await waitUntil(() => {
      expect(canvas.dataset.customIntensity).toBe('0.4');
      expect(canvas.dataset.customColor).toBe('#f59e0b');
    });

    cleanup();

    expect(canvas.dataset.customCleaned).toBe('true');
  });

  it('loads custom particle effects from a default function export', async () => {
    const { canvas } = createCanvasHarness();
    const cleanup = startCustomParticleEffect({
      canvas,
      intensity: 1,
      color: '#f59e0b',
      backgroundColor: '#0b1020',
      moduleUrl: createCustomEffectModuleUrl(`
        export default function activateParticleEffect({ canvas }) {
          canvas.dataset.defaultActivated = 'true';
          return () => {
            canvas.dataset.defaultCleaned = 'true';
          };
        }
      `),
    });

    await waitUntil(() => {
      expect(canvas.dataset.defaultActivated).toBe('true');
    });

    cleanup();

    expect(canvas.dataset.defaultCleaned).toBe('true');
  });

  it('logs custom particle modules that do not export an activator', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { canvas } = createCanvasHarness();

    startCustomParticleEffect({
      canvas,
      intensity: 1,
      color: '#9cdef2',
      backgroundColor: '#0b1020',
      moduleUrl: createCustomEffectModuleUrl('export const nothing = true;'),
    });

    await waitUntil(() => {
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('has no activateParticleEffect export'));
    });
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

function installBrowserMocks(): void {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 1,
  });
  vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

function createCanvasHarness(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1000 });
  Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 600 });
  canvas.getBoundingClientRect = vi.fn(() => ({
    bottom: 600,
    height: 600,
    left: 0,
    right: 1000,
    top: 0,
    width: 1000,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
  const ctx = createRuntimeContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
  return { canvas, ctx };
}

function createRuntimeContext(): CanvasRenderingContext2D {
  const ctx = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => createGradient()),
    createRadialGradient: vi.fn(() => createGradient()),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

function createCustomEffectModuleUrl(source: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

async function waitUntil(assertion: () => void): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  throw lastError;
}

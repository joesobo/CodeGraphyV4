// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKGROUND_PARTICLE_PRESETS,
  startBackgroundParticleEffect,
  startCustomParticleEffect,
} from '../src/effects';

describe('particle effect runtime', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(createSeededRandom());
    installBrowserMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(BACKGROUND_PARTICLE_PRESETS)('starts and cleans up the %s preset', (preset) => {
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

  it('returns a no-op cleanup when canvas context access is blocked', () => {
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

  it('loads named custom particle exports and disposes their cleanup', async () => {
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
  return {
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
}

function createGradient(): CanvasGradient {
  return {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;
}

function createCustomEffectModuleUrl(source: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

function createSeededRandom(seed = 12345): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
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

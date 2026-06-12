import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPetalsEffect } from '../src/effects/petals';
import { createSnowEffect } from '../src/effects/snow';
import { rgba, type EffectRuntime } from '../src/effects/shared';

describe('particle effect drawing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves rgb ember colors when alpha is applied', () => {
    expect(rgba('rgb(201 169 90)', 0.5)).toBe('rgba(201,169,90,0.5)');
  });

  it('prewarms leaves across the background instead of clumping them at one spawn point', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const translatedXs: number[] = [];
    const runtime = createRuntime({
      translate: (x: number) => {
        translatedXs.push(x);
      },
    });

    const effect = createPetalsEffect(runtime);
    effect.draw(runtime);

    expect(Math.min(...translatedXs)).toBeLessThan(200);
    expect(Math.max(...translatedXs)).toBeGreaterThan(700);
  });

  it('prewarms snow across the background', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const translatedXs: number[] = [];
    const runtime = createRuntime({
      translate: (x: number) => {
        translatedXs.push(x);
      },
    });

    const effect = createSnowEffect(runtime);
    effect.draw(runtime);

    expect(Math.min(...translatedXs)).toBeLessThan(200);
    expect(Math.max(...translatedXs)).toBeGreaterThan(700);
  });
});

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

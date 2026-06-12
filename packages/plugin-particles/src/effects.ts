import { createConstellationsEffect } from './effects/constellations';
import { createEmbersEffect } from './effects/embers';
import { createPerlinFlowEffect } from './effects/perlinFlow';
import { createPetalsEffect } from './effects/petals';
import { createRainEffect } from './effects/rain';
import type { EffectController, EffectRuntime } from './effects/shared';
import { createSnowEffect } from './effects/snow';
import { createSparklesEffect } from './effects/sparkles';
import { createSynapseEffect } from './effects/synapse';

export const BACKGROUND_PARTICLE_PRESETS = [
  'synapse',
  'rain',
  'constellations',
  'perlin-flow',
  'petals',
  'sparkles',
  'embers',
  'snow',
] as const;

export type BackgroundParticleEffectPreset = typeof BACKGROUND_PARTICLE_PRESETS[number];

export interface CustomParticleEffectContext {
  canvas: HTMLCanvasElement;
  intensity: number;
  color: string;
  backgroundColor: string;
}

export interface CustomParticleEffectModule {
  activateParticleEffect?: (context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>;
  default?: {
    activateParticleEffect?: (context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>;
  } | ((context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>);
}

interface BackgroundParticleEffectOptions {
  canvas: HTMLCanvasElement;
  preset: BackgroundParticleEffectPreset;
  intensity: number;
  color?: string;
  backgroundColor?: string;
  prewarmFrames?: number;
  reduceMotion?: boolean;
}

interface CustomParticleEffectOptions extends CustomParticleEffectContext {
  moduleUrl: string;
}

export function startBackgroundParticleEffect({
  canvas,
  preset,
  intensity,
  color = '#9cdef2',
  backgroundColor = '#0b1020',
  prewarmFrames = 120,
  reduceMotion = false,
}: BackgroundParticleEffectOptions): () => void {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) {
    return () => undefined;
  }

  let active = true;
  let animationFrame: number | null = null;
  const runtime: EffectRuntime = {
    ctx,
    canvas,
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    intensity: Math.max(0, Math.min(1, intensity)),
    size: 1,
    color,
    backgroundColor,
  };
  const resizeCanvas = (): void => {
    const rect = canvas.getBoundingClientRect();
    runtime.width = Math.max(1, rect.width || canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
    runtime.height = Math.max(1, rect.height || canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
    canvas.width = Math.round(runtime.width * runtime.dpr);
    canvas.height = Math.round(runtime.height * runtime.dpr);
    ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
  };

  resizeCanvas();
  const effect = createEffectController(preset, runtime);

  const resize = (): void => {
    resizeCanvas();
    effect.resize?.(runtime);
  };

  const tick = (): void => {
    if (!active) {
      return;
    }
    effect.draw(runtime);
    if (!reduceMotion) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  for (let frame = 0; frame < prewarmFrames; frame += 1) {
    effect.draw(runtime);
  }
  tick();

  return () => {
    active = false;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    window.removeEventListener('resize', resize);
    observer?.disconnect();
    ctx.clearRect(0, 0, runtime.width, runtime.height);
  };
}

export function startCustomParticleEffect({
  canvas,
  intensity,
  color,
  backgroundColor,
  moduleUrl,
}: CustomParticleEffectOptions): () => void {
  let cleanup: void | (() => void);
  let active = true;
  const stopSizingCanvas = bindCanvasToDisplaySize(canvas);

  void import(/* @vite-ignore */ moduleUrl)
    .then((mod: CustomParticleEffectModule) => {
      if (!active) {
        return undefined;
      }
      const activate = resolveCustomParticleEffectActivator(mod);
      if (!activate) {
        console.warn(`[CodeGraphy] Custom particle effect module "${moduleUrl}" has no activateParticleEffect export`);
        return undefined;
      }
      return activate({ canvas, intensity, color, backgroundColor });
    })
    .then((nextCleanup) => {
      if (typeof nextCleanup !== 'function') {
        return;
      }
      if (!active) {
        nextCleanup();
        return;
      }
      cleanup = nextCleanup;
    })
    .catch((error: unknown) => {
      console.error(`[CodeGraphy] Failed to load custom particle effect module "${moduleUrl}":`, error);
    });

  return () => {
    active = false;
    cleanup?.();
    stopSizingCanvas();
  };
}

function bindCanvasToDisplaySize(canvas: HTMLCanvasElement): () => void {
  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
    const height = Math.max(1, rect.height || canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };

  resize();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  window.addEventListener('resize', resize);

  return () => {
    window.removeEventListener('resize', resize);
    observer?.disconnect();
  };
}

function resolveCustomParticleEffectActivator(
  mod: CustomParticleEffectModule,
): CustomParticleEffectModule['activateParticleEffect'] {
  if (typeof mod.activateParticleEffect === 'function') {
    return mod.activateParticleEffect;
  }
  if (typeof mod.default === 'function') {
    return mod.default;
  }
  return mod.default?.activateParticleEffect;
}

function createEffectController(
  preset: BackgroundParticleEffectPreset,
  runtime: EffectRuntime,
): EffectController {
  switch (preset) {
    case 'synapse':
      return createSynapseEffect(runtime);
    case 'rain':
      return createRainEffect(runtime);
    case 'constellations':
      return createConstellationsEffect(runtime);
    case 'perlin-flow':
      return createPerlinFlowEffect(runtime);
    case 'petals':
      return createPetalsEffect(runtime);
    case 'sparkles':
      return createSparklesEffect(runtime);
    case 'embers':
      return createEmbersEffect(runtime);
    case 'snow':
      return createSnowEffect(runtime);
  }
}

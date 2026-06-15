import { createConstellationsEffect } from './effects/presets/constellations';
import { createEmbersEffect } from './effects/presets/embers';
import { createLeavesEffect } from './effects/presets/leaves';
import { createPerlinFlowEffect } from './effects/presets/perlinFlow';
import { createRainEffect } from './effects/presets/rain';
import type { EffectController, EffectRuntime } from './effects/runtime';
import { createSnowEffect } from './effects/presets/snow';
import { createSparklesEffect } from './effects/presets/sparkles';
import { createSynapseEffect } from './effects/presets/synapse';

export const BACKGROUND_PARTICLE_PRESETS = [
  'synapse',
  'rain',
  'constellations',
  'perlin-flow',
  'leaves',
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
  prewarmSeconds?: number;
  reduceMotion?: boolean;
}

interface CustomParticleEffectOptions extends CustomParticleEffectContext {
  moduleUrl: string;
}

export const BACKGROUND_PARTICLE_PREWARM_SECONDS = 72;

type EffectFactory = (runtime: EffectRuntime) => EffectController;

const EFFECT_FACTORIES: Record<BackgroundParticleEffectPreset, EffectFactory> = {
  synapse: createSynapseEffect,
  rain: createRainEffect,
  constellations: createConstellationsEffect,
  'perlin-flow': createPerlinFlowEffect,
  leaves: createLeavesEffect,
  sparkles: createSparklesEffect,
  embers: createEmbersEffect,
  snow: createSnowEffect,
};

export function startBackgroundParticleEffect({
  canvas,
  preset,
  intensity,
  color = '#9cdef2',
  backgroundColor = '#0b1020',
  prewarmSeconds = BACKGROUND_PARTICLE_PREWARM_SECONDS,
  reduceMotion = false,
}: BackgroundParticleEffectOptions): () => void {
  const ctx = getCanvasContext(canvas);
  if (!ctx) {
    return () => undefined;
  }

  let active = true;
  let animationFrame: number | null = null;
  const runtime = createRuntime(canvas, ctx, intensity, color, backgroundColor);
  const resizeCanvas = (): void => resizeRuntimeCanvas(runtime);

  resizeRuntimeCanvas(runtime);
  const effect = createEffectController(preset, runtime);

  const resize = (): void => {
    resizeCanvas();
    effect.resize?.(runtime);
  };

  const tick = (): void => {
    if (!active) {
      return;
    }
    runFrame(effect, runtime);
    if (shouldScheduleFrame(reduceMotion)) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  prewarmEffect(effect, runtime, prewarmSeconds);
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

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function createRuntime(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  intensity: number,
  color: string,
  backgroundColor: string,
): EffectRuntime {
  return {
    ctx,
    canvas,
    width: 0,
    height: 0,
    dpr: getDevicePixelRatio(),
    intensity: Math.max(0, Math.min(1, intensity)),
    size: 1,
    color,
    backgroundColor,
  };
}

function resizeRuntimeCanvas(runtime: EffectRuntime): void {
  const { width, height } = readCanvasDisplaySize(runtime.canvas);
  runtime.width = width;
  runtime.height = height;
  runtime.canvas.width = Math.round(width * runtime.dpr);
  runtime.canvas.height = Math.round(height * runtime.dpr);
  runtime.ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
}

function readCanvasDisplaySize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    width: readDimension(rect.width, canvas.clientWidth, canvas.parentElement?.clientWidth),
    height: readDimension(rect.height, canvas.clientHeight, canvas.parentElement?.clientHeight),
  };
}

function readDimension(...candidates: Array<number | undefined>): number {
  return Math.max(1, candidates.find(value => Boolean(value)) ?? 1);
}

function getDevicePixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function runFrame(effect: EffectController, runtime: EffectRuntime): void {
  stepEffect(effect, runtime, 1 / 60);
  effect.draw(runtime);
}

function shouldScheduleFrame(reduceMotion: boolean): boolean {
  return !reduceMotion;
}

function prewarmEffect(
  effect: EffectController,
  runtime: EffectRuntime,
  seconds: number,
): void {
  const steps = Math.max(0, Math.min(360, Math.ceil(seconds * 30)));
  if (steps === 0) {
    return;
  }

  const deltaSeconds = seconds / steps;
  for (let step = 0; step < steps; step += 1) {
    stepEffect(effect, runtime, deltaSeconds);
  }
}

function stepEffect(
  effect: EffectController,
  runtime: EffectRuntime,
  deltaSeconds: number,
): void {
  effect.step?.(runtime, deltaSeconds);
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
    const { width, height } = readCanvasDisplaySize(canvas);
    const dpr = getDevicePixelRatio();
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
  return EFFECT_FACTORIES[preset](runtime);
}

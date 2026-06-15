import {
  BACKGROUND_PARTICLE_PREWARM_SECONDS,
  startBackgroundParticleEffect,
  startCustomParticleEffect,
} from '../effects';
import type { ParticleEffectAsset, ParticlePreset, ParticleSettings } from './model';

const DEFAULT_EFFECT_COLOR = 'rgb(156 222 242)';
const LIGHT_SURFACE_EFFECT_COLOR = '#256f7a';
const EMBERS_EFFECT_COLOR = '#f59e0b';
const LEAVES_EFFECT_COLOR = '#8fcf6b';
const SNOW_EFFECT_COLOR = '#f8fafc';
const DEFAULT_BACKGROUND_COLOR = 'rgb(11 16 32)';

export function renderParticleCanvas(
  container: HTMLElement,
  settings: ParticleSettings,
  customEffects: readonly ParticleEffectAsset[] = [],
): () => void {
  container.replaceChildren();
  if (!settings.enabled || settings.preset === 'none') {
    return () => undefined;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'cg-bg-particles-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  if (settings.preset === 'custom') {
    const moduleUrl = settings.customModule
      ?? customEffects.find(effect => effect.id === settings.customEffectId)?.url;
    if (!moduleUrl) {
      return () => {
        canvas.remove();
      };
    }

    const cleanup = startCustomParticleEffect({
      canvas,
      intensity: getParticleIntensity(settings),
      color: resolveEffectColor(settings.preset, container),
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      moduleUrl,
    });
    return () => {
      cleanup();
      canvas.remove();
    };
  }

  const cleanup = startBackgroundParticleEffect({
    canvas,
    preset: settings.preset === 'petals' ? 'leaves' : settings.preset,
    intensity: getParticleIntensity(settings),
    color: resolveEffectColor(settings.preset, container),
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    prewarmSeconds: getPrewarmSeconds(settings.preset),
  });
  return () => {
    cleanup();
    canvas.remove();
  };
}

function getParticleIntensity(settings: ParticleSettings): number {
  return settings.intensity ?? 1;
}

function getPrewarmSeconds(preset: ParticlePreset): number {
  return preset === 'snow' ? 0 : BACKGROUND_PARTICLE_PREWARM_SECONDS;
}

function resolveEffectColor(preset: ParticlePreset, surface?: HTMLElement): string {
  if (preset === 'embers') {
    return EMBERS_EFFECT_COLOR;
  }
  if (preset === 'leaves' || preset === 'petals') {
    return LEAVES_EFFECT_COLOR;
  }
  if (preset === 'snow') {
    return SNOW_EFFECT_COLOR;
  }
  if (isLightSurface(surface)) {
    return LIGHT_SURFACE_EFFECT_COLOR;
  }
  return DEFAULT_EFFECT_COLOR;
}

function isLightSurface(surface?: HTMLElement): boolean {
  const color = resolveSurfaceBackgroundColor(surface);
  if (!color) {
    return false;
  }
  return getRelativeLuminance(color) > 0.55;
}

function resolveSurfaceBackgroundColor(surface?: HTMLElement): RgbColor | null {
  const candidates = [
    surface,
    surface?.parentElement,
    document.body,
    document.documentElement,
  ].filter((candidate): candidate is HTMLElement => Boolean(candidate));

  for (const candidate of candidates) {
    const color = parseCssColor(getComputedStyle(candidate).backgroundColor);
    if (color && color.alpha > 0) {
      return color;
    }
  }

  return null;
}

interface RgbColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

function parseCssColor(value: string): RgbColor | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    return parseHexColor(trimmed);
  }

  const match = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }

  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(part => Number.parseFloat(part));
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    return null;
  }

  return {
    red: clampColorChannel(parts[0]),
    green: clampColorChannel(parts[1]),
    blue: clampColorChannel(parts[2]),
    alpha: parts[3] === undefined ? 1 : Math.max(0, Math.min(1, parts[3])),
  };
}

function parseHexColor(value: string): RgbColor | null {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return null;
  }
  const hex = normalizeHexDigits(value.slice(1));
  const numeric = Number.parseInt(hex, 16);
  return {
    red: (numeric >> 16) & 255,
    green: (numeric >> 8) & 255,
    blue: numeric & 255,
    alpha: 1,
  };
}

function normalizeHexDigits(hex: string): string {
  return hex.length === 3
    ? hex.split('').map(char => `${char}${char}`).join('')
    : hex;
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function getRelativeLuminance({ red, green, blue }: RgbColor): number {
  const [r, g, b] = [red, green, blue].map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

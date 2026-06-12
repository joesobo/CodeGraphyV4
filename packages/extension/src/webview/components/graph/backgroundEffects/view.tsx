import React, { useEffect, useRef } from 'react';
import {
  startCustomParticleEffect,
  startOdysseusBackgroundEffect,
} from '@codegraphy-dev/plugin-particles/effects';
import type { BackgroundEffectsSettings } from '../../../../shared/settings/backgroundEffects';

const DEFAULT_EFFECT_COLOR = 'rgb(156 222 242)';
const EMBERS_EFFECT_COLOR = 'rgb(201 169 90)';
const LEAVES_EFFECT_COLOR = 'rgb(143 207 107)';
const DEFAULT_BACKGROUND_COLOR = 'rgb(11 16 32)';

function readCssColor(element: Element | null, names: readonly string[], fallback: string): string {
  if (!element) {
    return fallback;
  }
  const computed = getComputedStyle(element);
  for (const name of names) {
    const value = computed.getPropertyValue(name).trim();
    if (value) {
      return value;
    }
  }
  return fallback;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasCanvasRuntime(): boolean {
  return !navigator.userAgent.includes('jsdom');
}

function resolveEffectColor(preset: BackgroundEffectsSettings['preset']): string {
  if (preset === 'embers') {
    return EMBERS_EFFECT_COLOR;
  }
  if (preset === 'petals') {
    return LEAVES_EFFECT_COLOR;
  }
  return readCssColor(
    document.documentElement,
    ['--bg-effect-color', '--cg-foreground', '--vscode-foreground'],
    DEFAULT_EFFECT_COLOR,
  );
}

export function GraphBackgroundEffects({
  settings,
}: {
  settings: BackgroundEffectsSettings;
}): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !settings.enabled || settings.preset === 'none') {
      return undefined;
    }
    if (!hasCanvasRuntime()) {
      return undefined;
    }

    const color = resolveEffectColor(settings.preset);
    const backgroundColor = readCssColor(
      canvas.parentElement,
      ['--bg', '--cg-background', '--vscode-editor-background'],
      DEFAULT_BACKGROUND_COLOR,
    );

    if (settings.preset === 'custom') {
      if (!settings.customModule) {
        return undefined;
      }
      return startCustomParticleEffect({
        canvas,
        intensity: settings.intensity,
        color,
        backgroundColor,
        moduleUrl: settings.customModule,
      });
    }

    return startOdysseusBackgroundEffect({
      canvas,
      preset: settings.preset,
      intensity: settings.intensity,
      color,
      backgroundColor,
      prewarmFrames: 120,
      reduceMotion: prefersReducedMotion(),
    });
  }, [settings.customModule, settings.enabled, settings.intensity, settings.preset]);

  if (!settings.enabled || settings.preset === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full pointer-events-none"
      data-codegraphy-layer="graph-background-effects"
      data-effect-preset={settings.preset}
      data-testid="graph-background-effects"
      style={{ pointerEvents: 'none' }}
    />
  );
}

import React, { useEffect, useRef } from 'react';
import type { BackgroundEffectsSettings } from '../../../../shared/settings/backgroundEffects';
import { startOdysseusBackgroundEffect } from './odysseus';

const DEFAULT_EFFECT_COLOR = '#9cdef2';
const EMBERS_EFFECT_COLOR = '#c9a95a';
const DEFAULT_BACKGROUND_COLOR = '#0b1020';

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

    const color = settings.preset === 'embers'
      ? EMBERS_EFFECT_COLOR
      : readCssColor(
        document.documentElement,
        ['--bg-effect-color', '--cg-foreground', '--vscode-foreground'],
        DEFAULT_EFFECT_COLOR,
      );
    const backgroundColor = readCssColor(
      canvas.parentElement,
      ['--bg', '--cg-background', '--vscode-editor-background'],
      DEFAULT_BACKGROUND_COLOR,
    );

    return startOdysseusBackgroundEffect({
      canvas,
      preset: settings.preset,
      intensity: settings.intensity,
      color,
      backgroundColor,
      reduceMotion: prefersReducedMotion(),
    });
  }, [settings.enabled, settings.intensity, settings.preset]);

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

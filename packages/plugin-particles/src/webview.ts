import type { CodeGraphyWebviewAPI } from '@codegraphy-dev/plugin-api';
import {
  startCustomParticleEffect,
  startBackgroundParticleEffect,
} from './effects';

type ParticlePreset =
  | 'none'
  | 'synapse'
  | 'rain'
  | 'constellations'
  | 'perlin-flow'
  | 'petals'
  | 'sparkles'
  | 'embers'
  | 'custom';

interface ParticleSettings {
  enabled: boolean;
  preset: ParticlePreset;
  intensity: number;
  customModule?: string;
  customEffectId?: string;
}

interface ParticleEffectAsset {
  id: string;
  label: string;
  url: string;
  kind?: string;
}

const DEFAULT_PARTICLE_SETTINGS: ParticleSettings = {
  enabled: false,
  preset: 'none',
  intensity: 1,
};
const DEFAULT_EFFECT_COLOR = 'rgb(156 222 242)';
const EMBERS_EFFECT_COLOR = '#f59e0b';
const LEAVES_EFFECT_COLOR = '#8fcf6b';
const DEFAULT_BACKGROUND_COLOR = 'rgb(11 16 32)';

const PRESETS: Array<{ id: Exclude<ParticlePreset, 'none' | 'custom'>; label: string }> = [
  { id: 'synapse', label: 'Synapse' },
  { id: 'rain', label: 'Rain' },
  { id: 'constellations', label: 'Constellations' },
  { id: 'perlin-flow', label: 'Perlin Flow' },
  { id: 'petals', label: 'Leaves' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'embers', label: 'Embers' },
];

function isParticleSettings(value: unknown): value is ParticleSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ParticleSettings>;
  return typeof candidate.enabled === 'boolean'
    && typeof candidate.preset === 'string'
    && typeof candidate.intensity === 'number';
}

function readParticleSettings(api: CodeGraphyWebviewAPI): ParticleSettings {
  const data = api.getPluginData();
  return isParticleSettings(data)
    ? data
    : DEFAULT_PARTICLE_SETTINGS;
}

function resolveEffectColor(preset: ParticlePreset): string {
  if (preset === 'embers') {
    return EMBERS_EFFECT_COLOR;
  }
  if (preset === 'petals') {
    return LEAVES_EFFECT_COLOR;
  }
  return DEFAULT_EFFECT_COLOR;
}

function renderParticleCanvas(
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
      intensity: settings.intensity,
      color: resolveEffectColor(settings.preset),
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
    preset: settings.preset,
    intensity: settings.intensity,
    color: resolveEffectColor(settings.preset),
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    prewarmFrames: 180,
  });
  return () => {
    cleanup();
    canvas.remove();
  };
}

function createSwitch(checked: boolean, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-label', label);
  button.className = 'cg-bg-particles-switch';
  button.dataset.state = checked ? 'checked' : 'unchecked';
  button.innerHTML = '<span aria-hidden="true"></span>';
  return button;
}

function sendParticleSettings(api: CodeGraphyWebviewAPI, settings: ParticleSettings): void {
  api.setPluginData(settings);
}

function render(
  container: HTMLElement,
  api: CodeGraphyWebviewAPI,
  settings: ParticleSettings,
  customEffects: readonly ParticleEffectAsset[] = [],
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'cg-bg-particles-section';
  section.dataset.codegraphySection = 'background-effects';

  const heading = document.createElement('h3');
  heading.textContent = 'Graph Background';
  heading.className = 'cg-bg-particles-heading';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'cg-bg-particles-grid';
  section.appendChild(grid);

  for (const preset of PRESETS) {
    const checked = settings.enabled && settings.preset === preset.id;
    const row = document.createElement('div');
    row.className = 'cg-bg-particles-row';

    const label = document.createElement('span');
    label.textContent = preset.label;
    label.title = preset.label;
    row.appendChild(label);

    const control = createSwitch(checked, `Toggle ${preset.label} background effect`);
    control.addEventListener('click', () => {
      const nextEnabled = !(settings.enabled && settings.preset === preset.id);
      const nextSettings = nextEnabled
        ? { enabled: true, preset: preset.id, intensity: settings.intensity }
        : { ...DEFAULT_PARTICLE_SETTINGS, intensity: settings.intensity };
      render(container, api, nextSettings);
      sendParticleSettings(api, nextSettings);
    });
    row.appendChild(control);
    grid.appendChild(row);
  }

  for (const effect of customEffects) {
    const checked = settings.enabled
      && settings.preset === 'custom'
      && settings.customEffectId === effect.id;
    const row = document.createElement('div');
    row.className = 'cg-bg-particles-row';

    const label = document.createElement('span');
    label.textContent = effect.label;
    label.title = effect.label;
    row.appendChild(label);

    const control = createSwitch(checked, `Toggle ${effect.label} custom background effect`);
    control.addEventListener('click', () => {
      const nextEnabled = !(settings.enabled && settings.preset === 'custom' && settings.customEffectId === effect.id);
      const nextSettings = nextEnabled
        ? {
          enabled: true,
          preset: 'custom' as const,
          intensity: settings.intensity,
          customEffectId: effect.id,
        }
        : { ...DEFAULT_PARTICLE_SETTINGS, intensity: settings.intensity };
      render(container, api, nextSettings, customEffects);
      sendParticleSettings(api, nextSettings);
    });
    row.appendChild(control);
    grid.appendChild(row);
  }

  container.appendChild(section);
}

function isParticleEffectAsset(value: unknown): value is ParticleEffectAsset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ParticleEffectAsset>;
  return typeof candidate.id === 'string'
    && typeof candidate.label === 'string'
    && typeof candidate.url === 'string'
    && (candidate.kind === undefined || candidate.kind === 'particle-effect');
}

function readParticleEffectAssets(value: unknown): ParticleEffectAsset[] {
  return Array.isArray(value)
    ? value.filter(isParticleEffectAsset)
    : [];
}

function preloadCustomEffects(customEffects: readonly ParticleEffectAsset[]): void {
  for (const effect of customEffects) {
    void import(/* @vite-ignore */ effect.url).catch((error: unknown) => {
      console.error(`[CodeGraphy] Failed to preload custom particle effect "${effect.label}":`, error);
    });
  }
}

function injectStyles(): void {
  if (document.getElementById('cg-particles-plugin-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'cg-particles-plugin-style';
  style.textContent = `
    .cg-bg-particles-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .cg-bg-particles-canvas { height: 100%; inset: 0; pointer-events: none; position: absolute; width: 100%; }
    .cg-bg-particles-heading { color: var(--cg-text-muted); font-size: 0.75rem; font-weight: 600; letter-spacing: 0; line-height: 1rem; margin: 0; text-transform: uppercase; }
    .cg-bg-particles-grid { background: var(--cg-surface-subtle); border: 1px solid var(--cg-border-subtle); border-radius: 0.375rem; display: grid; gap: 0.5rem; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0.5rem; }
    .cg-bg-particles-row { align-items: center; border-radius: 0.25rem; display: flex; gap: 0.5rem; justify-content: space-between; min-width: 0; padding: 0.25rem 0.5rem; }
    .cg-bg-particles-row > span { color: var(--cg-text-primary); flex: 1; font-size: 0.75rem; line-height: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cg-bg-particles-switch { align-items: center; background: var(--cg-control-background); border: 1px solid var(--cg-border-subtle); border-radius: 999px; cursor: pointer; display: inline-flex; flex: 0 0 auto; height: 1.25rem; padding: 0.125rem; transition: background 120ms ease, border-color 120ms ease; width: 2.25rem; }
    .cg-bg-particles-switch[data-state='checked'] { background: var(--cg-accent); border-color: var(--cg-accent); }
    .cg-bg-particles-switch > span { background: var(--cg-surface); border-radius: 999px; display: block; height: 0.875rem; transform: translateX(0); transition: transform 120ms ease; width: 0.875rem; }
    .cg-bg-particles-switch[data-state='checked'] > span { transform: translateX(1rem); }
  `;
  document.head.appendChild(style);
}

export function activate(api: CodeGraphyWebviewAPI): () => void {
  injectStyles();
  const controlsContainer = api.getSlotContainer('theme.panel');
  const canvasContainer = api.getSlotContainer('graph.stage.worldOverlay');
  let canvasCleanup: () => void = () => undefined;
  let customEffects: ParticleEffectAsset[] = [];
  let currentSettings = readParticleSettings(api);
  const update = (settings: ParticleSettings): void => {
    currentSettings = settings;
    render(controlsContainer, api, settings, customEffects);
    canvasCleanup();
    canvasCleanup = renderParticleCanvas(canvasContainer, settings, customEffects);
  };

  update(currentSettings);

  const messageSubscription = api.onMessage((message) => {
    if (message.type === 'PLUGIN_WEBVIEW_ASSETS_UPDATED') {
      customEffects = readParticleEffectAssets(message.data);
      preloadCustomEffects(customEffects);
      update(currentSettings);
      return;
    }

    if (message.type !== 'PLUGIN_DATA_UPDATED') {
      return;
    }

    if (isParticleSettings(message.data)) {
      update(message.data);
    }
  });

  return () => {
    messageSubscription.dispose();
    canvasCleanup();
    canvasCleanup = () => undefined;
    controlsContainer.replaceChildren();
    canvasContainer.replaceChildren();
    document.getElementById('cg-particles-plugin-style')?.remove();
  };
}

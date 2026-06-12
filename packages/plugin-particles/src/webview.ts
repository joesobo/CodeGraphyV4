import type { CodeGraphyWebviewAPI } from '@codegraphy-dev/plugin-api';

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

interface BackgroundEffectsSettings {
  enabled: boolean;
  preset: ParticlePreset;
  intensity: number;
  customModule?: string;
}

const DEFAULT_BACKGROUND_EFFECTS: BackgroundEffectsSettings = {
  enabled: false,
  preset: 'none',
  intensity: 1,
};

const PRESETS: Array<{ id: Exclude<ParticlePreset, 'none' | 'custom'>; label: string }> = [
  { id: 'synapse', label: 'Synapse' },
  { id: 'rain', label: 'Rain' },
  { id: 'constellations', label: 'Constellations' },
  { id: 'perlin-flow', label: 'Perlin Flow' },
  { id: 'petals', label: 'Leaves' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'embers', label: 'Embers' },
];

function isBackgroundEffectsSettings(value: unknown): value is BackgroundEffectsSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BackgroundEffectsSettings>;
  return typeof candidate.enabled === 'boolean'
    && typeof candidate.preset === 'string'
    && typeof candidate.intensity === 'number';
}

function readHostBackgroundEffects(api: CodeGraphyWebviewAPI): BackgroundEffectsSettings {
  const state = api.getHostState();
  return isBackgroundEffectsSettings(state.backgroundEffects)
    ? state.backgroundEffects
    : DEFAULT_BACKGROUND_EFFECTS;
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

function sendBackgroundEffects(api: CodeGraphyWebviewAPI, backgroundEffects: BackgroundEffectsSettings): void {
  api.postHostMessage({
    type: 'UPDATE_BACKGROUND_EFFECTS',
    payload: { backgroundEffects },
  });
}

function render(container: HTMLElement, api: CodeGraphyWebviewAPI, settings: BackgroundEffectsSettings): void {
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
        : { ...DEFAULT_BACKGROUND_EFFECTS, intensity: settings.intensity };
      render(container, api, nextSettings);
      sendBackgroundEffects(api, nextSettings);
    });
    row.appendChild(control);
    grid.appendChild(row);
  }

  container.appendChild(section);
}

function injectStyles(): void {
  if (document.getElementById('cg-particles-plugin-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'cg-particles-plugin-style';
  style.textContent = `
    .cg-bg-particles-section { display: flex; flex-direction: column; gap: 0.5rem; }
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

export function activate(api: CodeGraphyWebviewAPI): void {
  injectStyles();
  const container = api.getSlotContainer('theme.panel');
  render(container, api, readHostBackgroundEffects(api));

  api.onMessage((message) => {
    if (message.type !== 'BACKGROUND_EFFECTS_UPDATED') {
      return;
    }

    if (isBackgroundEffectsSettings(message.data)) {
      render(container, api, message.data);
    }
  });
}

import type { CodeGraphyWebviewAPI } from '@codegraphy-dev/extension-plugin-api';

export type ParticlePreset =
  | 'none'
  | 'synapse'
  | 'rain'
  | 'constellations'
  | 'perlin-flow'
  | 'leaves'
  | 'petals'
  | 'sparkles'
  | 'embers'
  | 'snow'
  | 'custom';

export interface ParticleSettings {
  enabled: boolean;
  preset: ParticlePreset;
  intensity?: number;
  customModule?: string;
  customEffectId?: string;
}

export interface ParticleEffectAsset {
  id: string;
  label: string;
  url: string;
  kind?: string;
}

export const DEFAULT_PARTICLE_SETTINGS: ParticleSettings = {
  enabled: false,
  preset: 'none',
};

export const PRESETS: Array<{ id: Exclude<ParticlePreset, 'none' | 'custom' | 'petals'>; label: string }> = [
  { id: 'synapse', label: 'Synapse' },
  { id: 'rain', label: 'Rain' },
  { id: 'constellations', label: 'Constellations' },
  { id: 'perlin-flow', label: 'Perlin Flow' },
  { id: 'leaves', label: 'Leaves' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'embers', label: 'Embers' },
  { id: 'snow', label: 'Snow' },
];

export function isParticleSettings(value: unknown): value is ParticleSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ParticleSettings>;
  return typeof candidate.enabled === 'boolean'
    && typeof candidate.preset === 'string'
    && (candidate.intensity === undefined || typeof candidate.intensity === 'number');
}

export function readParticleSettings(api: CodeGraphyWebviewAPI): ParticleSettings {
  return readParticleSettingsOrNull(api) ?? DEFAULT_PARTICLE_SETTINGS;
}

export function readParticleSettingsOrNull(api: CodeGraphyWebviewAPI): ParticleSettings | null {
  const data = api.getPluginData();
  return isParticleSettings(data) ? normalizeParticleSettings(data) : null;
}

export function normalizeParticleSettings(settings: ParticleSettings): ParticleSettings {
  return settings.preset === 'petals'
    ? { ...settings, preset: 'leaves' }
    : settings;
}

export function sameParticleSettings(left: ParticleSettings, right: ParticleSettings): boolean {
  return left.enabled === right.enabled
    && left.preset === right.preset
    && left.intensity === right.intensity
    && left.customModule === right.customModule
    && left.customEffectId === right.customEffectId;
}

export function isParticleEffectAsset(value: unknown): value is ParticleEffectAsset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ParticleEffectAsset>;
  return typeof candidate.id === 'string'
    && typeof candidate.label === 'string'
    && typeof candidate.url === 'string'
    && (candidate.kind === undefined || candidate.kind === 'particle-effect');
}

export function readParticleEffectAssets(value: unknown): ParticleEffectAsset[] {
  return Array.isArray(value)
    ? value.filter(isParticleEffectAsset)
    : [];
}

export function getVisibleCustomEffects(
  settings: ParticleSettings,
  customEffects: readonly ParticleEffectAsset[],
): ParticleEffectAsset[] {
  if (
    settings.enabled
    && settings.preset === 'custom'
    && settings.customEffectId
    && !customEffects.some(effect => effect.id === settings.customEffectId)
  ) {
    return [
      ...customEffects,
      {
        id: settings.customEffectId,
        label: toEffectLabel(settings.customEffectId),
        url: settings.customModule ?? '',
        kind: 'particle-effect',
      },
    ];
  }

  return [...customEffects];
}

export function toEffectLabel(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || id;
}

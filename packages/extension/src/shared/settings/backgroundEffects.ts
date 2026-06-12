export const BACKGROUND_EFFECT_PRESETS = [
  'none',
  'synapse',
  'rain',
  'constellations',
  'perlin-flow',
  'petals',
  'sparkles',
  'embers',
  'custom',
] as const;

export type BackgroundEffectPreset = typeof BACKGROUND_EFFECT_PRESETS[number];

export interface BackgroundEffectsSettings {
  enabled: boolean;
  preset: BackgroundEffectPreset;
  intensity: number;
  customModule?: string;
}

export const DEFAULT_BACKGROUND_EFFECTS: BackgroundEffectsSettings = {
  enabled: false,
  preset: 'none',
  intensity: 1,
};

export function isBackgroundEffectPreset(value: unknown): value is BackgroundEffectPreset {
  return typeof value === 'string'
    && (BACKGROUND_EFFECT_PRESETS as readonly string[]).includes(value);
}

function clampIntensity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : DEFAULT_BACKGROUND_EFFECTS.intensity;
}

function normalizeCustomModule(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const modulePath = value.trim();
  return modulePath.length > 0 ? modulePath : undefined;
}

export function normalizeBackgroundEffectsSettings(value: unknown): BackgroundEffectsSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_BACKGROUND_EFFECTS };
  }

  const record = value as Record<string, unknown>;
  const enabled = typeof record.enabled === 'boolean'
    ? record.enabled
    : DEFAULT_BACKGROUND_EFFECTS.enabled;
  const preset = isBackgroundEffectPreset(record.preset)
    ? record.preset
    : DEFAULT_BACKGROUND_EFFECTS.preset;
  const customModule = normalizeCustomModule(record.customModule);

  return {
    enabled: enabled && preset !== 'none' && (preset !== 'custom' || Boolean(customModule)),
    preset,
    intensity: clampIntensity(record.intensity),
    ...(customModule ? { customModule } : {}),
  };
}

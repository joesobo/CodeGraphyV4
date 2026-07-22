import type { GraphLayoutConfig } from '@codegraphy-dev/graph-renderer';

export interface ForceSettings {
  centerForce: number;
  linkDistance: number;
  linkForce: number;
  repelForce: number;
}

export type ForceSettingKey = keyof ForceSettings;
const EXTENSION_DEFAULT_VELOCITY_DECAY: number = 0.4;

export interface ForceControl {
  decimals: number;
  key: ForceSettingKey;
  label: string;
  maximum: number;
  minimum: number;
  step: number;
}

const FORCE_CONTROLS_BY_KEY = {
  repelForce: { key: 'repelForce', label: 'Repel Force', minimum: 0, maximum: 20, step: 1, decimals: 0 },
  centerForce: { key: 'centerForce', label: 'Center Force', minimum: 0, maximum: 1, step: 0.01, decimals: 2 },
  linkDistance: { key: 'linkDistance', label: 'Link Distance', minimum: 5, maximum: 100, step: 5, decimals: 0 },
  linkForce: { key: 'linkForce', label: 'Link Force', minimum: 0, maximum: 2, step: 0.01, decimals: 2 },
} satisfies Record<ForceSettingKey, ForceControl>;

const FORCE_CONTROL_ORDER: readonly ForceSettingKey[] = [
  'repelForce',
  'centerForce',
  'linkDistance',
  'linkForce',
];

export const FORCE_CONTROLS: readonly ForceControl[] = FORCE_CONTROL_ORDER.map(
  key => FORCE_CONTROLS_BY_KEY[key],
);

export const DEFAULT_FORCE_SETTINGS: Readonly<ForceSettings> = {
  repelForce: 10,
  centerForce: 0.1,
  linkDistance: 80,
  linkForce: 1,
};

export function normalizeForceValue(control: ForceControl, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_FORCE_SETTINGS[control.key];
  }
  return Math.min(control.maximum, Math.max(control.minimum, value));
}

export function readForceSettings(value: unknown): ForceSettings {
  const candidate = value && typeof value === 'object'
    ? value as Partial<Record<ForceSettingKey, unknown>>
    : {};
  return {
    repelForce: normalizeForceValue(FORCE_CONTROLS_BY_KEY.repelForce, candidate.repelForce),
    centerForce: normalizeForceValue(FORCE_CONTROLS_BY_KEY.centerForce, candidate.centerForce),
    linkDistance: normalizeForceValue(FORCE_CONTROLS_BY_KEY.linkDistance, candidate.linkDistance),
    linkForce: normalizeForceValue(FORCE_CONTROLS_BY_KEY.linkForce, candidate.linkForce),
  };
}

export function toGraphLayoutConfig(settings: ForceSettings): Partial<GraphLayoutConfig> {
  return {
    centralGravity: settings.centerForce,
    chargeStrength: -(settings.repelForce / 20) * 500,
    linkDistance: settings.linkDistance,
    linkStrength: settings.linkForce,
    velocityDecay: EXTENSION_DEFAULT_VELOCITY_DECAY,
  };
}

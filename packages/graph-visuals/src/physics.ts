export interface GraphPhysicsSettings {
  repelForce: number;
  linkDistance: number;
  linkForce: number;
  damping: number;
  centerForce: number;
}

export const DEFAULT_GRAPH_PHYSICS_SETTINGS: GraphPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 1,
  damping: 0.4,
  centerForce: 0.1,
};

export const GRAPH_PHYSICS_CONTROL_LIMITS = {
  repelForce: { min: 0, max: 20, step: 1 },
  centerForce: { min: 0, max: 1, step: 0.01 },
  linkDistance: { min: 30, max: 150, step: 10 },
  linkForce: { min: 0, max: 2, step: 0.01 },
} as const;

export interface GraphLayoutPhysicsConfig {
  centralGravity: number;
  chargeStrength: number;
  linkDistance: number;
  linkStrength: number;
  velocityDecay: number;
}

export interface GraphPhysicsConfigTarget {
  setConfig(config: GraphLayoutPhysicsConfig): void;
}

export function toGraphPhysicsLayoutConfig(
  settings: GraphPhysicsSettings,
): GraphLayoutPhysicsConfig {
  const normalized = normalizeGraphPhysicsSettings(settings);
  return {
    centralGravity: normalized.centerForce,
    chargeStrength: -(normalized.repelForce / GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.max) * 500,
    linkDistance: normalized.linkDistance,
    linkStrength: normalized.linkForce,
    velocityDecay: normalized.damping,
  };
}

export function normalizeGraphPhysicsSettings(
  settings: GraphPhysicsSettings,
): GraphPhysicsSettings {
  return {
    repelForce: normalizeGraphPhysicsSetting('repelForce', settings.repelForce),
    centerForce: normalizeGraphPhysicsSetting('centerForce', settings.centerForce),
    linkDistance: normalizeGraphPhysicsSetting('linkDistance', settings.linkDistance),
    linkForce: normalizeGraphPhysicsSetting('linkForce', settings.linkForce),
    damping: normalizeGraphPhysicsSetting('damping', settings.damping),
  };
}

export function normalizeGraphPhysicsSetting(
  key: keyof GraphPhysicsSettings,
  value: number,
): number {
  if (key === 'damping') {
    return normalizedSetting(value, 0, 1, DEFAULT_GRAPH_PHYSICS_SETTINGS.damping);
  }
  const limits = GRAPH_PHYSICS_CONTROL_LIMITS[key];
  return normalizedSetting(value, limits.min, limits.max, DEFAULT_GRAPH_PHYSICS_SETTINGS[key]);
}

export function applyGraphPhysicsSettings(
  target: GraphPhysicsConfigTarget,
  settings: GraphPhysicsSettings,
): void {
  target.setConfig(toGraphPhysicsLayoutConfig(settings));
}

function normalizedSetting(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

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
  linkDistance: { min: 30, max: 500, step: 10 },
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
  const repelForce = normalizedSetting(
    settings.repelForce,
    GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.min,
    GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.max,
    DEFAULT_GRAPH_PHYSICS_SETTINGS.repelForce,
  );
  return {
    centralGravity: normalizedSetting(
      settings.centerForce,
      GRAPH_PHYSICS_CONTROL_LIMITS.centerForce.min,
      GRAPH_PHYSICS_CONTROL_LIMITS.centerForce.max,
      DEFAULT_GRAPH_PHYSICS_SETTINGS.centerForce,
    ),
    chargeStrength: -(repelForce / GRAPH_PHYSICS_CONTROL_LIMITS.repelForce.max) * 500,
    linkDistance: normalizedSetting(
      settings.linkDistance,
      GRAPH_PHYSICS_CONTROL_LIMITS.linkDistance.min,
      GRAPH_PHYSICS_CONTROL_LIMITS.linkDistance.max,
      DEFAULT_GRAPH_PHYSICS_SETTINGS.linkDistance,
    ),
    linkStrength: normalizedSetting(
      settings.linkForce,
      GRAPH_PHYSICS_CONTROL_LIMITS.linkForce.min,
      GRAPH_PHYSICS_CONTROL_LIMITS.linkForce.max,
      DEFAULT_GRAPH_PHYSICS_SETTINGS.linkForce,
    ),
    velocityDecay: normalizedSetting(
      settings.damping,
      0,
      1,
      DEFAULT_GRAPH_PHYSICS_SETTINGS.damping,
    ),
  };
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

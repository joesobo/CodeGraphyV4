import type { GraphLayoutConfig, GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';

function normalizedSetting(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

export function toOwnedPhysicsConfig(settings: IPhysicsSettings): Partial<GraphLayoutConfig> {
  const repelForce = normalizedSetting(settings.repelForce, 0, 20, 10);
  return {
    centralGravity: normalizedSetting(settings.centerForce, 0, 1, 0.1),
    chargeStrength: -(repelForce / 20) * 500,
    linkDistance: normalizedSetting(settings.linkDistance, 30, 500, 80),
    linkStrength: normalizedSetting(settings.linkForce, 0, 2, 1),
    velocityDecay: normalizedSetting(settings.damping, 0, 1, 0.4),
  };
}

export function applyOwnedPhysicsSettings(engine: GraphLayoutEngine, settings: IPhysicsSettings): void {
  engine.setConfig(toOwnedPhysicsConfig(settings));
}

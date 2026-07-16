import type { GraphLayoutConfig } from '../contracts';

const FLOAT32_CONFIG_FIELDS: ReadonlySet<keyof GraphLayoutConfig> = new Set([
  'centralGravity',
  'chargeDistanceMax',
  'chargeDistanceMin',
  'chargeStrength',
  'chargeTheta',
  'collisionPadding',
  'collisionStrength',
  'initializationSpacing',
  'linkDistance',
  'linkStrength',
  'settleSpeed',
  'velocityDecay',
]);

function isFiniteFloat32(value: number): boolean {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value));
}

export function assertFiniteGraphLayoutConfig(config: GraphLayoutConfig): void {
  for (const key of Object.keys(config) as Array<keyof GraphLayoutConfig>) {
    const value = config[key];
    const infiniteChargeDistance = key === 'chargeDistanceMax'
      && value === Number.POSITIVE_INFINITY;
    if (!Number.isFinite(value) && !infiniteChargeDistance) {
      throw new Error(`Graph layout config ${key} must be finite`);
    }
    if (!infiniteChargeDistance && FLOAT32_CONFIG_FIELDS.has(key) && !isFiniteFloat32(value)) {
      throw new Error(`Graph layout config ${key} must fit the finite 32-bit float range`);
    }
  }
}

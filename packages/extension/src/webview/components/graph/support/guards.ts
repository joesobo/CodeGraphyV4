import type { DistanceMaxForce, LinkDistanceForce, StrengthForce } from './contracts/forceGraph';

export function hasStrength(force: unknown): force is StrengthForce {
  const candidate = force as { strength?: unknown } | null | undefined;
  return typeof candidate?.strength === 'function';
}

export function hasDistanceAndStrength(force: unknown): force is LinkDistanceForce {
  const candidate = force as { distance?: unknown; strength?: unknown } | null | undefined;
  return typeof candidate?.distance === 'function' && typeof candidate?.strength === 'function';
}

export function hasDistanceMax(force: unknown): force is DistanceMaxForce {
  const candidate = force as { distanceMax?: unknown } | null | undefined;
  return typeof candidate?.distanceMax === 'function';
}

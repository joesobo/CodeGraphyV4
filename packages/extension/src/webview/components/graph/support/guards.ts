import type { DistanceMaxForce, LinkDistanceForce, StrengthForce } from './contracts/types';

export function isRecordLike(value: unknown): value is Record<string, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function hasStrength(force: unknown): force is StrengthForce {
  if (!isRecordLike(force)) return false;
  return typeof (force as { strength?: unknown }).strength === 'function';
}

export function hasDistanceAndStrength(force: unknown): force is LinkDistanceForce {
  if (!isRecordLike(force)) return false;
  const candidate = force as { distance?: unknown; strength?: unknown };
  return typeof candidate.distance === 'function' && typeof candidate.strength === 'function';
}

export function hasDistanceMax(force: unknown): force is DistanceMaxForce {
  if (!isRecordLike(force)) return false;
  return typeof (force as { distanceMax?: unknown }).distanceMax === 'function';
}

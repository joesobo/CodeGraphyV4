import { describe, expect, it } from 'vitest';
import {
  clamp,
  getFiniteVelocity,
  isFiniteNumber,
  isFinitePair,
  isFinitePositiveNumber,
  resolveNodeCoordinate,
} from '../../../../../../src/webview/components/graph/runtime/physics/numeric';

describe('webview/components/graph/runtime/physics/numeric', () => {
  it('accepts only finite numbers', () => {
    expect(isFiniteNumber(4)).toBe(true);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber('4')).toBe(false);
  });

  it('accepts only positive finite numbers', () => {
    expect(isFinitePositiveNumber(4)).toBe(true);
    expect(isFinitePositiveNumber(0)).toBe(false);
    expect(isFinitePositiveNumber(-1)).toBe(false);
    expect(isFinitePositiveNumber(Number.NaN)).toBe(false);
    expect(isFinitePositiveNumber('4')).toBe(false);
  });

  it('accepts only finite two-number pairs', () => {
    expect(isFinitePair([0, 1])).toBe(true);
    expect(isFinitePair([0, Number.NaN])).toBe(false);
    expect(isFinitePair([0, 1, 2])).toBe(false);
    expect(isFinitePair('pair')).toBe(false);
  });

  it('clamps values into the provided bounds', () => {
    expect(clamp(6, 1, 4)).toBe(4);
    expect(clamp(-1, 1, 4)).toBe(1);
    expect(clamp(3, 1, 4)).toBe(3);
  });

  it('uses the midpoint when clamp bounds are reversed', () => {
    expect(clamp(10, 8, 2)).toBe(5);
  });

  it('falls back for non-finite coordinates and velocities', () => {
    expect(resolveNodeCoordinate(12, 3)).toBe(12);
    expect(resolveNodeCoordinate(Number.NaN, 3)).toBe(3);
    expect(resolveNodeCoordinate(undefined, 3)).toBe(3);

    expect(getFiniteVelocity(2)).toBe(2);
    expect(getFiniteVelocity(Number.POSITIVE_INFINITY)).toBe(0);
    expect(getFiniteVelocity(undefined)).toBe(0);
  });
});

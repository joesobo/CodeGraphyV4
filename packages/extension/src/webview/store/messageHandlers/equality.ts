import deepEqual from 'fast-deep-equal';

export function arePlainValuesEqual(left: unknown, right: unknown): boolean {
  // Stryker disable next-line all
  if (typeof left === 'number' && typeof right === 'number') {
    return Object.is(left, right);
  }

  return deepEqual(left, right);
}

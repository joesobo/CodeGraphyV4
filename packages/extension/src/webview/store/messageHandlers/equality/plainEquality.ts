import deepEqual from 'fast-deep-equal';

export function arePlainObjectValuesEqual(left: unknown, right: unknown): boolean {
  return deepEqual(left, right);
}

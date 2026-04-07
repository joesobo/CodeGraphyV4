import deepEqualImport from 'fast-deep-equal';

const deepEqual = deepEqualImport as (left: unknown, right: unknown) => boolean;

export function arePlainObjectValuesEqual(left: unknown, right: unknown): boolean {
  return deepEqual(left, right);
}

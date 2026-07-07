import { isObjectRecord } from '../../../../shared/records';

export function arePlainObjectValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length
      && left.every((item, index) => arePlainObjectValuesEqual(item, right[index]));
  }

  if (isObjectRecord(left) && isObjectRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return leftKeys.length === rightKeys.length
      && leftKeys.every((key) => arePlainObjectValuesEqual(left[key], right[key]));
  }

  return false;
}

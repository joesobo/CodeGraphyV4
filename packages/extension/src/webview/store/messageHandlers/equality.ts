import { areNumberValuesEqual } from './equality/numberEquality';
import { arePlainObjectValuesEqual } from './equality/plainEquality';
import { isNumberPair } from './equality/isNumberPair';

export function arePlainValuesEqual(left: unknown, right: unknown): boolean {
  if (isNumberPair(left, right)) {
    return areNumberValuesEqual(left as number, right as number);
  }

  return arePlainObjectValuesEqual(left, right);
}

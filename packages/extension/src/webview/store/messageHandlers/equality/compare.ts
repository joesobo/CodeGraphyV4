import { areNumberValuesEqual } from './numbers';
import { isNumberPair } from './isNumberPair';
import { arePlainObjectValuesEqual } from './structures';

export function arePlainValuesEqual(left: unknown, right: unknown): boolean {
  if (isNumberPair(left, right)) {
    return areNumberValuesEqual(left as number, right as number);
  }

  return arePlainObjectValuesEqual(left, right);
}

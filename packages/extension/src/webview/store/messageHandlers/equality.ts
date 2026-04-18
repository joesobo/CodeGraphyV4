import { areNumberValuesEqual } from './equality/numbers';
import { isNumberPair } from './equality/isNumberPair';
import { arePlainObjectValuesEqual } from './equality/structures';

export function arePlainValuesEqual(left: unknown, right: unknown): boolean {
  if (isNumberPair(left, right)) {
    return areNumberValuesEqual(left as number, right as number);
  }

  return arePlainObjectValuesEqual(left, right);
}

import {
  compareGraphArrayValues,
  compareGraphRecordValues,
} from './collections';

export function areGraphValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  return compareGraphArrayValues(left, right, areGraphValuesEqual)
    ?? compareGraphRecordValues(left, right, areGraphValuesEqual);
}

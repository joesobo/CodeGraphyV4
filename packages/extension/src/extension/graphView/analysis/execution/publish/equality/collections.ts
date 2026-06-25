type CompareGraphValue = (left: unknown, right: unknown) => boolean;

function areGraphRecordsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  compareValue: CompareGraphValue,
): boolean {
  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  for (const key of keys) {
    if (!compareValue(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}

function areGraphArraysEqual(
  left: readonly unknown[],
  right: readonly unknown[],
  compareValue: CompareGraphValue,
): boolean {
  return left.length === right.length
    && left.every((leftValue, index) => compareValue(leftValue, right[index]));
}

function isGraphRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value);
}

export function compareGraphArrayValues(
  left: unknown,
  right: unknown,
  compareValue: CompareGraphValue,
): boolean | undefined {
  if (!Array.isArray(left) && !Array.isArray(right)) {
    return undefined;
  }

  return Array.isArray(left) && Array.isArray(right) && areGraphArraysEqual(left, right, compareValue);
}

export function compareGraphRecordValues(
  left: unknown,
  right: unknown,
  compareValue: CompareGraphValue,
): boolean {
  return isGraphRecord(left) && isGraphRecord(right) && areGraphRecordsEqual(left, right, compareValue);
}

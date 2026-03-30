export function linePressure(lineCount: number): number {
  return Math.max(0, Math.min(6, Math.ceil((lineCount - 8) / 6)));
}

export function assertionPressure(assertionCount: number): number {
  if (assertionCount === 0) {
    return 8;
  }

  return assertionCount === 1 ? 3 : 0;
}

export function branchPressure(branchCount: number): number {
  return Math.min(6, branchCount * 2);
}

export function mockPressure(mockCount: number): number {
  return Math.min(4, mockCount);
}

export function helperHiddenPressure(helperHiddenLineCount: number): number {
  return Math.max(0, Math.min(6, Math.ceil((helperHiddenLineCount - 4) / 6)));
}

export function duplicateSetupPressure(duplicateSetupGroupSize: number, setupLineCount: number): number {
  if (duplicateSetupGroupSize < 2 || setupLineCount < 2) {
    return 0;
  }

  return Math.min(4, duplicateSetupGroupSize - 1 + Math.floor((setupLineCount - 2) / 3));
}

export function nestingPressure(describeDepth: number): number {
  return Math.max(0, describeDepth - 2);
}

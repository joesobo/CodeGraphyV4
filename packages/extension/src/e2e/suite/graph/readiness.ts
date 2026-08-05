function edgeIdMatchesExpected(actualId: string, expectedId: string): boolean {
  return actualId === expectedId || actualId.startsWith(`${expectedId}:`);
}

export function includesExpectedEdgeIds(
  actualIds: readonly string[],
  expectedIds: readonly string[],
): boolean {
  return missingExpectedEdgeIds(actualIds, expectedIds).length === 0;
}

export function missingExpectedEdgeIds(
  actualIds: readonly string[],
  expectedIds: readonly string[],
): string[] {
  return expectedIds.filter(
    expectedId => !actualIds.some(actualId => edgeIdMatchesExpected(actualId, expectedId)),
  );
}

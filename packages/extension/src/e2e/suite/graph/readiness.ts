function edgeIdMatchesExpected(actualId: string, expectedId: string): boolean {
  return actualId === expectedId || actualId.startsWith(`${expectedId}:`);
}

export function includesExpectedEdgeIds(
  actualIds: readonly string[],
  expectedIds: readonly string[],
): boolean {
  return expectedIds.every(
    expectedId => actualIds.some(actualId => edgeIdMatchesExpected(actualId, expectedId)),
  );
}

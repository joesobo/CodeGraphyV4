export function calculateCrap(complexity: number, coverage: number): number {
  const uncovered = 1 - coverage / 100;
  return complexity ** 2 * uncovered ** 3 + complexity;
}

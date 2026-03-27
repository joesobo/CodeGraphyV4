export function remediationMode(
  exampleCount: number,
  averageScore: number,
  hotExampleCount: number,
  maxScore: number
): 'LOCAL' | 'SPLIT' | 'STABLE' {
  if (hotExampleCount >= 3 || (exampleCount >= 8 && averageScore >= 5)) {
    return 'SPLIT';
  }

  if (maxScore >= 6 || averageScore >= 4) {
    return 'LOCAL';
  }

  return 'STABLE';
}

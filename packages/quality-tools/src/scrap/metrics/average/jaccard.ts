function similaritySet(features: string[] | undefined): Set<string> {
  return new Set(features ?? []);
}

export function jaccardSimilarity(left: string[] | undefined, right: string[] | undefined): number {
  const leftSet = similaritySet(left);
  const rightSet = similaritySet(right);

  let intersection = 0;
  leftSet.forEach((feature) => {
    if (rightSet.has(feature)) {
      intersection += 1;
    }
  });

  const union = new Set([...leftSet, ...rightSet]).size;
  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

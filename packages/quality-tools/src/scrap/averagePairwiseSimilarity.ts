import { jaccardSimilarity } from './jaccardSimilarity';

export function averagePairwiseSimilarity(featureLists: Array<string[] | undefined>): number {
  let total = 0;
  let pairs = 0;

  featureLists.forEach((leftFeatures, left) => {
    featureLists.slice(left + 1).forEach((rightFeatures) => {
      total += jaccardSimilarity(leftFeatures, rightFeatures);
      pairs += 1;
    });
  });

  return pairs === 0 ? 0 : total / pairs;
}

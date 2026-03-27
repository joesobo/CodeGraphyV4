import { connectedComponents } from './similarityComponents';
export { averagePairwiseSimilarity } from './averagePairwiseSimilarity';
export { jaccardSimilarity } from './jaccardSimilarity';

export function featureGroupSizes(featureLists: Array<string[] | undefined>, threshold = 0.5): number[] {
  const sizes = Array.from({ length: featureLists.length }, () => 0);
  connectedComponents(featureLists, threshold).forEach((component) => {
    component.forEach((index) => {
      sizes[index] = component.length;
    });
  });
  return sizes;
}

export function shapeDiversity(featureLists: Array<string[] | undefined>, threshold = 0.5): number {
  return connectedComponents(featureLists, threshold).length;
}

import { connectedComponents } from './components';
export { pairwiseSimilarity } from './pairwise';
export { jaccardSimilarity } from './jaccard';

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

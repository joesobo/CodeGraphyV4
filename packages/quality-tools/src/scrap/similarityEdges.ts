import { jaccardSimilarity } from './jaccardSimilarity';

function addSimilarityEdge(edges: Map<number, number[]>, left: number, right: number): void {
  edges.get(left)!.push(right);
  edges.get(right)!.push(left);
}

export function buildSimilarityEdges(
  featureLists: Array<string[] | undefined>,
  threshold: number
): Map<number, number[]> {
  const edges = new Map<number, number[]>();

  featureLists.forEach((features, index) => {
    if ((features?.length ?? 0) > 0) {
      edges.set(index, []);
    }
  });

  featureLists.forEach((leftFeatures, left) => {
    featureLists.slice(left + 1).forEach((rightFeatures, offset) => {
      const right = left + offset + 1;
      if (jaccardSimilarity(leftFeatures, rightFeatures) >= threshold) {
        addSimilarityEdge(edges, left, right);
      }
    });
  });

  return edges;
}

import type { IGraphData } from '@codegraphy-dev/plugin-api';

import { generateSyntheticGraph } from './generate';
import { hashGraphFixture } from './hash';

export const SYNTHETIC_FIXTURE_PRESETS = {
  '500': 500,
  '1k': 1_000,
  '2.5k': 2_500,
  '5k': 5_000,
  '10k': 10_000,
} as const;

export type SyntheticFixtureName = keyof typeof SYNTHETIC_FIXTURE_PRESETS;

export interface BenchmarkFixture {
  schemaVersion: 1;
  source: {
    kind: 'synthetic';
    name: SyntheticFixtureName;
    seed: number;
    generatorVersion: 1;
  };
  graph: IGraphData;
  summary: {
    nodeCount: number;
    edgeCount: number;
    orphanCount: number;
  };
  fixtureHash: string;
}

function countOrphans(graph: IGraphData): number {
  const connectedNodeIds = new Set<string>();
  graph.edges.forEach((edge) => {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  });
  return graph.nodes.reduce(
    (count, node) => count + (connectedNodeIds.has(node.id) ? 0 : 1),
    0,
  );
}

export function createSyntheticFixture(
  name: SyntheticFixtureName,
  seed: number,
): BenchmarkFixture {
  const graph = generateSyntheticGraph({
    nodeCount: SYNTHETIC_FIXTURE_PRESETS[name],
    seed,
  });

  return {
    schemaVersion: 1,
    source: {
      kind: 'synthetic',
      name,
      seed,
      generatorVersion: 1,
    },
    graph,
    summary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      orphanCount: countOrphans(graph),
    },
    fixtureHash: hashGraphFixture(graph),
  };
}

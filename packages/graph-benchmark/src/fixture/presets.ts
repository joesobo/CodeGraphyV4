import type { IGraphData } from '@codegraphy-dev/plugin-api';

import { generateSyntheticGraph } from './generate';
import { hashGraphFixture } from './hash';

export const SYNTHETIC_FIXTURE_PRESETS = {
  'tiny': 9,
  '500': 500,
  '1k': 1_000,
  '2.5k': 2_500,
  '5k': 5_000,
  '10k': 10_000,
} as const;

export type SyntheticFixtureName = keyof typeof SYNTHETIC_FIXTURE_PRESETS;

export const DEFAULT_SYNTHETIC_FIXTURE_SEED = 307;

export function isSyntheticFixtureName(value: string): value is SyntheticFixtureName {
  return Object.hasOwn(SYNTHETIC_FIXTURE_PRESETS, value);
}

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

function createTinyStarGraph(): IGraphData {
  const hub = {
    id: 'tiny/hub.ts',
    label: 'hub.ts',
    color: '#67E8F9',
    nodeType: 'file' as const,
  };
  const leaves = Array.from({ length: 8 }, (_, index) => ({
    id: `tiny/leaf-${index}.ts`,
    label: `leaf-${index}.ts`,
    color: '#93C5FD',
    nodeType: 'file' as const,
  }));
  return {
    nodes: [hub, ...leaves],
    edges: leaves.map(leaf => ({
      id: `${hub.id}->${leaf.id}#import`,
      from: hub.id,
      to: leaf.id,
      kind: 'import',
      sources: [],
    })),
  };
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
  const graph = name === 'tiny'
    ? createTinyStarGraph()
    : generateSyntheticGraph({
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

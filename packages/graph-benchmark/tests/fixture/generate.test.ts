import { describe, expect, it } from 'vitest';

import { generateSyntheticGraph } from '../../src/fixture/generate';

describe('generateSyntheticGraph', () => {
  it('generates the requested graph deterministically from its seed', () => {
    const options = { nodeCount: 4, seed: 307 };

    const first = generateSyntheticGraph(options);
    const second = generateSyntheticGraph(options);

    expect(first.nodes.map((node) => node.id)).toEqual([
      'packages/package-0000/src/file-000000.ts',
      'packages/package-0000/src/file-000001.ts',
      'packages/package-0000/src/file-000002.ts',
      'packages/package-0000/src/file-000003.ts',
    ]);
    expect(first).toEqual(second);

    const nodeIds = new Set(first.nodes.map((node) => node.id));
    expect(first.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))).toBe(true);
  });

  it('changes the relationship topology when the seed changes', () => {
    const first = generateSyntheticGraph({ nodeCount: 64, seed: 307 });
    const second = generateSyntheticGraph({ nodeCount: 64, seed: 308 });

    expect(first.nodes.map((node) => node.id)).toEqual(
      second.nodes.map((node) => node.id),
    );
    expect(first.edges).not.toEqual(second.edges);
  });

  it('rejects a negative node count', () => {
    expect(() => generateSyntheticGraph({ nodeCount: -1, seed: 307 })).toThrow(
      'nodeCount must be a non-negative integer',
    );
  });
});

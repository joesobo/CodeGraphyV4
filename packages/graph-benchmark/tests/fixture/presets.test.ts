import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';

describe('createSyntheticFixture', () => {
  it.each([
    ['tiny', 9],
    ['500', 500],
    ['1k', 1_000],
    ['2.5k', 2_500],
    ['5k', 5_000],
    ['10k', 10_000],
  ] as const)('creates the deterministic %s performance tier', (name, nodeCount) => {
    const fixture = createSyntheticFixture(name, 307);

    expect(fixture.source.name).toBe(name);
    expect(fixture.summary.nodeCount).toBe(nodeCount);
    expect(fixture.fixtureHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('creates a versioned 10k fixture envelope', () => {
    const fixture = createSyntheticFixture('10k', 307);

    expect(fixture).toMatchObject({
      schemaVersion: 1,
      source: {
        kind: 'synthetic',
        name: '10k',
        seed: 307,
        generatorVersion: 1,
      },
      summary: {
        nodeCount: 10_000,
        edgeCount: 31_089,
        orphanCount: 200,
      },
    });
    expect(fixture.fixtureHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('models a clustered import graph with a skewed degree distribution', () => {
    const fixture = createSyntheticFixture('10k', 307);
    const inDegrees = new Map(fixture.graph.nodes.map((node) => [node.id, 0]));
    const edgeIds = new Set(fixture.graph.edges.map((edge) => edge.id));
    let localEdgeCount = 0;

    fixture.graph.edges.forEach((edge) => {
      inDegrees.set(edge.to, (inDegrees.get(edge.to) ?? 0) + 1);
      const fromPackage = edge.from.split('/')[1];
      const toPackage = edge.to.split('/')[1];
      if (fromPackage === toPackage) localEdgeCount += 1;
    });

    const sortedInDegrees = [...inDegrees.values()].sort((left, right) => left - right);
    const median = sortedInDegrees[Math.floor(sortedInDegrees.length * 0.5)];
    const percentile99 = sortedInDegrees[Math.floor(sortedInDegrees.length * 0.99)];
    const containsCycle = fixture.graph.edges.some((edge) =>
      edgeIds.has(`${edge.to}->${edge.from}#import`),
    );

    expect(percentile99).toBeGreaterThan(median * 10);
    expect(localEdgeCount / fixture.graph.edges.length).toBeGreaterThan(0.7);
    expect(containsCycle).toBe(true);
  });

  it('retains fixture identity across repeated 10k runs', () => {
    const first = createSyntheticFixture('10k', 307);
    const second = createSyntheticFixture('10k', 307);

    expect(second.summary).toEqual(first.summary);
    expect(second.fixtureHash).toBe(first.fixtureHash);
  });
});

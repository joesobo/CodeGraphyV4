import { describe, expect, it } from 'vitest';
import {
  findImportComponents,
  bfsComponent
} from '../../../src/organize/cohesion/components';
import type { ImportAdjacency } from '../../../src/organize/cohesion/importGraph';

describe('findImportComponents', () => {
  it('finds single isolated file as a component', () => {
    const fileNames = ['a.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(new Set(['a.ts']));
  });

  it('finds connected files as a single component', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('finds multiple disconnected components', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts', 'd.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set()],
      ['c.ts', new Set(['d.ts'])],
      ['d.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(2);
    expect(components).toContainEqual(new Set(['a.ts', 'b.ts']));
    expect(components).toContainEqual(new Set(['c.ts', 'd.ts']));
  });

  it('handles cyclic dependencies (treats as undirected)', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set(['a.ts'])] // cycle back to a
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('handles empty file list', () => {
    const fileNames: string[] = [];
    const graph: ImportAdjacency = new Map();

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(0);
  });

  it('handles missing files from graph (no edges)', () => {
    const fileNames = ['a.ts', 'b.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set()],
      ['b.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(2);
    expect(components[0]).toEqual(new Set(['a.ts']));
    expect(components[1]).toEqual(new Set(['b.ts']));
  });

  it('treats imports as undirected (backward edges)', () => {
    const fileNames = ['a.ts', 'b.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set()] // b does not import a, but a imports b
    ]);

    const components = findImportComponents(fileNames, graph);

    // Should still find them connected (a -> b is also b <- a in undirected sense)
    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(new Set(['a.ts', 'b.ts']));
  });

  it('finds star-shaped component (one hub)', () => {
    const fileNames = ['hub.ts', 'a.ts', 'b.ts', 'c.ts'];
    const graph: ImportAdjacency = new Map([
      ['hub.ts', new Set(['a.ts', 'b.ts', 'c.ts'])],
      ['a.ts', new Set()],
      ['b.ts', new Set()],
      ['c.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(new Set(['hub.ts', 'a.ts', 'b.ts', 'c.ts']));
  });

  it('filters out empty components', () => {
    const fileNames = ['a.ts'];
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set()]
    ]);

    const components = findImportComponents(fileNames, graph);

    expect(components).toHaveLength(1);
    expect(components[0].size).toBeGreaterThan(0);
  });
});

describe('bfsComponent', () => {
  it('finds component starting from a single file', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set()]
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(component).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
    expect(visited).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('marks all members as visited', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set()],
      ['c.ts', new Set()] // disconnected
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(visited).toEqual(new Set(['a.ts', 'b.ts']));
  });

  it('respects already visited nodes', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set()]
    ]);

    const visited = new Set(['b.ts']); // b.ts already visited
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    // Should still add a but not re-visit b
    expect(component).toEqual(new Set(['a.ts']));
  });

  it('handles cyclic dependencies without infinite loop', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set(['a.ts'])] // cycle
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(component).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
    expect(visited).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('handles missing graph entries', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])]
      // 'b.ts' not in graph
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(component).toEqual(new Set(['a.ts', 'b.ts']));
  });

  it('treats graph as undirected (backward edges)', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set()]
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    // Start from 'c' going backward through the graph
    bfsComponent('c.ts', graph, visited, component);

    // Should reach all because we check both forward and backward edges
    expect(component).toEqual(new Set(['c.ts', 'b.ts', 'a.ts']));
  });

  it('handles single file with no dependencies', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set()]
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(component).toEqual(new Set(['a.ts']));
    expect(visited).toEqual(new Set(['a.ts']));
  });

  it('handles self-referential imports', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['a.ts'])] // a imports itself
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent('a.ts', graph, visited, component);

    expect(component).toEqual(new Set(['a.ts']));
  });

  it('explores backward edges from all nodes', () => {
    const graph: ImportAdjacency = new Map([
      ['a.ts', new Set(['b.ts', 'c.ts'])],
      ['b.ts', new Set(['d.ts'])],
      ['c.ts', new Set()],
      ['d.ts', new Set()]
    ]);

    const visited = new Set<string>();
    const component = new Set<string>();

    // Start from 'd' - should find a through backward traversal
    bfsComponent('d.ts', graph, visited, component);

    expect(component).toEqual(new Set(['d.ts', 'b.ts', 'a.ts', 'c.ts']));
  });

  it('handles large star component efficiently', () => {
    const files = Array.from({ length: 10 }, (_, i) => `file${i}.ts`);
    const graph: ImportAdjacency = new Map();

    // Create hub that imports all others
    const hub = 'hub.ts';
    graph.set(hub, new Set(files));
    for (const file of files) {
      graph.set(file, new Set());
    }

    const visited = new Set<string>();
    const component = new Set<string>();

    bfsComponent(hub, graph, visited, component);

    expect(component.size).toBe(11); // hub + 10 files
    expect(component.has(hub)).toBe(true);
    for (const file of files) {
      expect(component.has(file)).toBe(true);
    }
  });
});

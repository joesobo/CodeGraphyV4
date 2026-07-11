import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../src/graph/contracts';
import {
  applyGraphDataPatchInPlace,
  diffGraphData,
  graphDataPatchSchema,
} from '../../src/graph/diff';

function node(id: string, color = '#111111'): IGraphData['nodes'][number] {
  return { id, label: id, color };
}

function edge(
  id: string,
  from: string,
  to: string,
  color?: string,
): IGraphData['edges'][number] {
  return { id, from, to, kind: 'import', color, sources: [] };
}

describe('graph/diff', () => {
  it('describes node additions, removals, updates, and edge replacements', () => {
    const previous: IGraphData = {
      nodes: [node('keep'), node('update'), node('remove')],
      edges: [edge('keep->update#import', 'keep', 'update'), edge('replace', 'update', 'remove')],
    };
    const next: IGraphData = {
      nodes: [node('keep'), node('update', '#ffffff'), node('add')],
      edges: [
        edge('keep->update#import', 'keep', 'update'),
        edge('replace', 'update', 'add', '#ffffff'),
        edge('add->keep#import', 'add', 'keep'),
      ],
    };

    expect(diffGraphData(previous, next)).toEqual({
      addedNodes: [node('add')],
      removedNodeIds: ['remove'],
      updatedNodes: [node('update', '#ffffff')],
      addedLinks: [
        edge('replace', 'update', 'add', '#ffffff'),
        edge('add->keep#import', 'add', 'keep'),
      ],
      removedLinkIds: ['replace'],
    });
  });

  it('returns an empty patch for semantically equal graphs', () => {
    const graph: IGraphData = {
      nodes: [node('keep')],
      edges: [edge('keep->keep#import', 'keep', 'keep')],
    };

    expect(diffGraphData(graph, structuredClone(graph))).toEqual({
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      addedLinks: [],
      removedLinkIds: [],
    });
  });

  it('applies a diff to produce the next graph while preserving retained identities', () => {
    const retainedNode = node('keep');
    const updatedNode = node('update');
    updatedNode.favorite = true;
    const retainedEdge = edge('keep->update#import', 'keep', 'update');
    const previous: IGraphData = {
      nodes: [retainedNode, updatedNode, node('remove')],
      edges: [retainedEdge, edge('remove', 'update', 'remove')],
    };
    const next: IGraphData = {
      nodes: [node('keep'), node('update', '#ffffff'), node('add')],
      edges: [retainedEdge, edge('add', 'update', 'add')],
    };

    const result = applyGraphDataPatchInPlace(previous, diffGraphData(previous, next));

    expect(result).toEqual(next);
    expect(result).toBe(previous);
    expect(result.nodes[0]).toBe(retainedNode);
    expect(result.nodes[1]).toBe(updatedNode);
    expect(result.nodes[1]).not.toHaveProperty('favorite');
    expect(result.edges[0]).toBe(retainedEdge);
  });

  it('treats order-only differences as semantic no-ops', () => {
    const previous: IGraphData = {
      nodes: [node('first'), node('second')],
      edges: [edge('first', 'first', 'second'), edge('second', 'second', 'first')],
    };
    const next: IGraphData = {
      nodes: [node('second'), node('first')],
      edges: [edge('second', 'second', 'first'), edge('first', 'first', 'second')],
    };

    const patch = diffGraphData(previous, next);
    applyGraphDataPatchInPlace(previous, patch);

    expect(patch).toEqual({
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      addedLinks: [],
      removedLinkIds: [],
    });
    expect([...previous.nodes].sort(byId)).toEqual([...next.nodes].sort(byId));
    expect([...previous.edges].sort(byId)).toEqual([...next.edges].sort(byId));
  });

  it.each([
    {
      name: 'empty IDs',
      patch: {
        addedNodes: [node('')],
        removedNodeIds: [],
        updatedNodes: [],
        addedLinks: [],
        removedLinkIds: [],
      },
    },
    {
      name: 'duplicate IDs',
      patch: {
        addedNodes: [node('same'), node('same')],
        removedNodeIds: [],
        updatedNodes: [],
        addedLinks: [],
        removedLinkIds: [],
      },
    },
    {
      name: 'conflicting node operations',
      patch: {
        addedNodes: [node('same')],
        removedNodeIds: [],
        updatedNodes: [node('same')],
        addedLinks: [],
        removedLinkIds: [],
      },
    },
  ])('rejects $name', ({ patch }) => {
    expect(graphDataPatchSchema.safeParse(patch).success).toBe(false);
  });

  it('rejects duplicate IDs in source graphs', () => {
    const duplicate: IGraphData = { nodes: [node('same'), node('same')], edges: [] };

    expect(() => diffGraphData(duplicate, { nodes: [], edges: [] }))
      .toThrow('Duplicate graph node id: same');
  });

  it('rejects invalid operations before mutating the graph', () => {
    const graph: IGraphData = { nodes: [node('keep')], edges: [] };
    const snapshot = structuredClone(graph);

    expect(() => applyGraphDataPatchInPlace(graph, {
      addedNodes: [],
      removedNodeIds: ['keep'],
      updatedNodes: [node('missing')],
      addedLinks: [],
      removedLinkIds: [],
    })).toThrow('Cannot update missing graph item: missing');
    expect(graph).toEqual(snapshot);
  });
});

function byId(left: { id: string }, right: { id: string }): number {
  return left.id.localeCompare(right.id);
}

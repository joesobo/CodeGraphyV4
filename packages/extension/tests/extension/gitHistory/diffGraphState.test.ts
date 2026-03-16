import { describe, expect, it } from 'vitest';
import {
  deleteGitHistoryGraphFile,
  renameGitHistoryGraphFile,
} from '../../../src/extension/gitHistory/diffGraphState';

describe('gitHistory/diffGraphState', () => {
  it('removes the node and all incoming and outgoing edges for a deleted file', () => {
    const nodes = [
      { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' },
    ];
    const edges = [
      { id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' },
      { id: 'src/b.ts->src/a.ts', from: 'src/b.ts', to: 'src/a.ts' },
      { id: 'src/b.ts->src/b.ts', from: 'src/b.ts', to: 'src/b.ts' },
    ];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const edgeSet = new Set(edges.map((edge) => edge.id));

    deleteGitHistoryGraphFile('src/a.ts', nodes, edges, nodeMap, edgeSet);

    expect(nodes).toEqual([{ id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' }]);
    expect(nodeMap.has('src/a.ts')).toBe(false);
    expect(edges).toEqual([{ id: 'src/b.ts->src/b.ts', from: 'src/b.ts', to: 'src/b.ts' }]);
    expect(edgeSet).toEqual(new Set(['src/b.ts->src/b.ts']));
  });

  it('refreshes the renamed node metadata in the node map', () => {
    const renamedNode = { id: 'src/old.ts', label: 'old.ts', color: '#93C5FD' };
    const unchangedEdge = { id: 'src/c.ts->src/d.ts', from: 'src/c.ts', to: 'src/d.ts' };
    const edges = [
      { id: 'src/old.ts->src/b.ts', from: 'src/old.ts', to: 'src/b.ts' },
      unchangedEdge,
    ];
    const nodeMap = new Map([[renamedNode.id, renamedNode]]);
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.py', edges, nodeMap, edgeSet);

    expect(renamedNode).toEqual({ id: 'src/new.py', label: 'new.py', color: '#A1A1AA' });
    expect(nodeMap.has('src/old.ts')).toBe(false);
    expect(nodeMap.get('src/new.py')).toBe(renamedNode);
    expect(edges[1]).toBe(unchangedEdge);
    expect(edgeSet.has('src/c.ts->src/d.ts')).toBe(true);
  });

  it('recomputes edge ids for renamed outgoing, incoming, and self edges', () => {
    const outgoingEdge = { id: 'src/old.ts->src/b.ts', from: 'src/old.ts', to: 'src/b.ts' };
    const incomingEdge = { id: 'src/c.ts->src/old.ts', from: 'src/c.ts', to: 'src/old.ts' };
    const selfEdge = { id: 'src/old.ts->src/old.ts', from: 'src/old.ts', to: 'src/old.ts' };
    const unchangedEdge = { id: 'src/x.ts->src/y.ts', from: 'src/x.ts', to: 'src/y.ts' };
    const edges = [outgoingEdge, incomingEdge, selfEdge, unchangedEdge];
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.ts', edges, new Map(), edgeSet);

    expect(edges).toEqual([
      { id: 'src/new.ts->src/b.ts', from: 'src/new.ts', to: 'src/b.ts' },
      { id: 'src/c.ts->src/new.ts', from: 'src/c.ts', to: 'src/new.ts' },
      { id: 'src/new.ts->src/new.ts', from: 'src/new.ts', to: 'src/new.ts' },
      { id: 'src/x.ts->src/y.ts', from: 'src/x.ts', to: 'src/y.ts' },
    ]);
    expect(edgeSet).toEqual(
      new Set([
        'src/new.ts->src/b.ts',
        'src/c.ts->src/new.ts',
        'src/new.ts->src/new.ts',
        'src/x.ts->src/y.ts',
      ]),
    );
  });

  it('still repoints edges when the renamed node is not present in the map', () => {
    const incomingEdge = { id: 'src/c.ts->src/old.ts', from: 'src/c.ts', to: 'src/old.ts' };
    const outgoingEdge = { id: 'src/old.ts->src/b.ts', from: 'src/old.ts', to: 'src/b.ts' };
    const edges = [incomingEdge, outgoingEdge];
    const nodeMap = new Map();
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.ts', edges, nodeMap, edgeSet);

    expect(nodeMap.size).toBe(0);
    expect(edges).toEqual([
      { id: 'src/c.ts->src/new.ts', from: 'src/c.ts', to: 'src/new.ts' },
      { id: 'src/new.ts->src/b.ts', from: 'src/new.ts', to: 'src/b.ts' },
    ]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/new.ts', 'src/new.ts->src/b.ts']));
  });
});

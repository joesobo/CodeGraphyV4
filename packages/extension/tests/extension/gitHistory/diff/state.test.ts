import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../src/shared/graph/contracts';
import {
  deleteGitHistoryGraphFile,
  renameGitHistoryGraphFile,
} from '../../../../src/extension/gitHistory/diff/state';

describe('gitHistory/diff/state', () => {
  it('removes the node and all incoming and outgoing edges for a deleted file', () => {
    const nodes = [
      { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' },
    ];
    const edges: IGraphEdge[] = [
      { id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
      { id: 'src/b.ts->src/a.ts#import', from: 'src/b.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
      { id: 'src/b.ts->src/b.ts#import', from: 'src/b.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
    ];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const edgeSet = new Set(edges.map((edge) => edge.id));

    deleteGitHistoryGraphFile('src/a.ts', nodes, edges, nodeMap, edgeSet);

    expect(nodes).toEqual([{ id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' }]);
    expect(nodeMap.has('src/a.ts')).toBe(false);
    expect(edges).toEqual([{ id: 'src/b.ts->src/b.ts#import', from: 'src/b.ts', to: 'src/b.ts' , kind: 'import', sources: [] }]);
    expect(edgeSet).toEqual(new Set(['src/b.ts->src/b.ts#import']));
  });

  it('refreshes the renamed node metadata in the node map', () => {
    const renamedNode = { id: 'src/old.ts', label: 'old.ts', color: '#93C5FD' };
    const unchangedEdge: IGraphEdge = { id: 'src/c.ts->src/d.ts#import', from: 'src/c.ts', to: 'src/d.ts' , kind: 'import', sources: [] };
    const edges: IGraphEdge[] = [
      { id: 'src/old.ts->src/b.ts#import', from: 'src/old.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
      unchangedEdge,
    ];
    const nodeMap = new Map([[renamedNode.id, renamedNode]]);
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.py', edges, nodeMap, edgeSet);

    expect(renamedNode).toEqual({ id: 'src/new.py', label: 'new.py', color: '#A1A1AA' });
    expect(nodeMap.has('src/old.ts')).toBe(false);
    expect(nodeMap.get('src/new.py')).toBe(renamedNode);
    expect(edges[1]).toBe(unchangedEdge);
    expect(edgeSet.has('src/c.ts->src/d.ts#import')).toBe(true);
  });

  it('recomputes edge ids for renamed outgoing, incoming, and self edges', () => {
    const outgoingEdge: IGraphEdge = { id: 'src/old.ts->src/b.ts#import', from: 'src/old.ts', to: 'src/b.ts' , kind: 'import', sources: [] };
    const incomingEdge: IGraphEdge = { id: 'src/c.ts->src/old.ts#import', from: 'src/c.ts', to: 'src/old.ts' , kind: 'import', sources: [] };
    const selfEdge: IGraphEdge = { id: 'src/old.ts->src/old.ts#import', from: 'src/old.ts', to: 'src/old.ts' , kind: 'import', sources: [] };
    const unchangedEdge: IGraphEdge = { id: 'src/x.ts->src/y.ts#import', from: 'src/x.ts', to: 'src/y.ts' , kind: 'import', sources: [] };
    const edges: IGraphEdge[] = [outgoingEdge, incomingEdge, selfEdge, unchangedEdge];
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.ts', edges, new Map(), edgeSet);

    expect(edges).toEqual([
      { id: 'src/new.ts->src/b.ts#import', from: 'src/new.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
      { id: 'src/c.ts->src/new.ts#import', from: 'src/c.ts', to: 'src/new.ts' , kind: 'import', sources: [] },
      { id: 'src/new.ts->src/new.ts#import', from: 'src/new.ts', to: 'src/new.ts' , kind: 'import', sources: [] },
      { id: 'src/x.ts->src/y.ts#import', from: 'src/x.ts', to: 'src/y.ts' , kind: 'import', sources: [] },
    ]);
    expect(edgeSet).toEqual(
      new Set([
        'src/new.ts->src/b.ts#import',
        'src/c.ts->src/new.ts#import',
        'src/new.ts->src/new.ts#import',
        'src/x.ts->src/y.ts#import',
      ]),
    );
  });

  it('still repoints edges when the renamed node is not present in the map', () => {
    const incomingEdge: IGraphEdge = { id: 'src/c.ts->src/old.ts#import', from: 'src/c.ts', to: 'src/old.ts' , kind: 'import', sources: [] };
    const outgoingEdge: IGraphEdge = { id: 'src/old.ts->src/b.ts#import', from: 'src/old.ts', to: 'src/b.ts' , kind: 'import', sources: [] };
    const edges: IGraphEdge[] = [incomingEdge, outgoingEdge];
    const nodeMap = new Map();
    const edgeSet = new Set(edges.map((edge) => edge.id));

    renameGitHistoryGraphFile('src/old.ts', 'src/new.ts', edges, nodeMap, edgeSet);

    expect(nodeMap.size).toBe(0);
    expect(edges).toEqual([
      { id: 'src/c.ts->src/new.ts#import', from: 'src/c.ts', to: 'src/new.ts' , kind: 'import', sources: [] },
      { id: 'src/new.ts->src/b.ts#import', from: 'src/new.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
    ]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/new.ts#import', 'src/new.ts->src/b.ts#import']));
  });
});

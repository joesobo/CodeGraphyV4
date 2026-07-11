import { describe, expect, it } from 'vitest';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { reconcileRuntimeGraphData } from '../../../../../src/webview/components/graph/runtime/data/reconcile';

describe('graph/runtime/data/reconcile', () => {
  it('updates presentation while preserving node identity and motion state', () => {
    const current = runtimeNode('a', {
      color: '#111111',
      metadata: { stale: true },
      x: 1,
      y: 2,
      z: 3,
      vx: 4,
      vy: 5,
      vz: 6,
      fx: 7,
      fy: 8,
      fz: 9,
    });
    const desired = runtimeNode('a', { color: '#ffffff', metadata: { fresh: true } });

    const result = reconcileRuntimeGraphData(
      { nodes: [current], links: [] },
      { nodes: [desired], links: [] },
    );

    expect(result.structureChanged).toBe(false);
    expect(result.graphData.nodes[0]).toBe(current);
    expect(current).toMatchObject({
      color: '#ffffff',
      metadata: { fresh: true },
      x: 1,
      y: 2,
      z: 3,
      vx: 4,
      vy: 5,
      vz: 6,
      fx: 7,
      fy: 8,
      fz: 9,
    });
  });

  it('adds topology while preserving untouched node and link identities', () => {
    const first = runtimeNode('a', { x: 10, vx: 2 });
    const second = runtimeNode('b', { x: 20, vx: 3 });
    const currentLink = runtimeLink('a->b', first, second);

    const result = reconcileRuntimeGraphData(
      { nodes: [first, second], links: [currentLink] },
      {
        nodes: [runtimeNode('a'), runtimeNode('b'), runtimeNode('c')],
        links: [
          runtimeLink('a->b', 'a', 'b'),
          runtimeLink('b->c', 'b', 'c'),
        ],
      },
    );

    expect(result.structureChanged).toBe(true);
    expect(result.graphData.nodes[0]).toBe(first);
    expect(result.graphData.nodes[1]).toBe(second);
    expect(result.graphData.links[0]).toBe(currentLink);
    expect(currentLink.source).toBe(first);
    expect(currentLink.target).toBe(second);
  });

  it('drops removed items without replacing retained nodes', () => {
    const retained = runtimeNode('keep');

    const result = reconcileRuntimeGraphData(
      { nodes: [retained, runtimeNode('remove')], links: [] },
      { nodes: [runtimeNode('keep')], links: [] },
    );

    expect(result.structureChanged).toBe(true);
    expect(result.graphData.nodes).toEqual([retained]);
  });

  it('replaces a same-id link when its topology changes', () => {
    const current = runtimeLink('edge', 'a', 'b');
    const desired = runtimeLink('edge', 'a', 'c');

    const result = reconcileRuntimeGraphData(
      { nodes: [], links: [current] },
      { nodes: [], links: [desired] },
    );

    expect(result.structureChanged).toBe(true);
    expect(result.graphData.links).toEqual([desired]);
    expect(result.graphData.links[0]).not.toBe(current);
  });
});

function runtimeNode(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    id,
    label: id,
    size: 4,
    color: '#111111',
    borderColor: '#111111',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    ...overrides,
  } as FGNode;
}

function runtimeLink(
  id: string,
  source: string | FGNode,
  target: string | FGNode,
): FGLink {
  const from = typeof source === 'string' ? source : source.id;
  const to = typeof target === 'string' ? target : target.id;
  return {
    id,
    from,
    to,
    source,
    target,
    kind: 'import',
    bidirectional: false,
  };
}

import { describe, expect, it } from 'vitest';
import { resolveTimelineSeedNeighbor } from '../../../../src/webview/components/graph/model/timelinePositionSeedNeighbor';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';

function makeNode(id: string, x?: number, y?: number): FGNode {
  return { id, label: id, size: 16, color: '#93C5FD', borderColor: '#93C5FD', borderWidth: 2, baseOpacity: 1, isFavorite: false, x, y } as FGNode;
}

describe('resolveTimelineSeedNeighbor', () => {
  it('returns the connected neighbor for an unpositioned node', () => {
    const node = makeNode('new.ts');
    const neighbor = makeNode('anchor.ts', 100, 200);

    expect(
      resolveTimelineSeedNeighbor(
        node,
        [{ id: 'new.ts->anchor.ts', from: 'new.ts', to: 'anchor.ts', kind: 'import', sources: [] }],
        new Map([[node.id, node], [neighbor.id, neighbor]]),
      ),
    ).toBe(neighbor);
  });

  it('returns undefined for already positioned nodes', () => {
    const node = makeNode('new.ts', 100, undefined);
    const neighbor = makeNode('anchor.ts', 100, 200);

    expect(
      resolveTimelineSeedNeighbor(
        node,
        [{ id: 'new.ts->anchor.ts', from: 'new.ts', to: 'anchor.ts', kind: 'import', sources: [] }],
        new Map([[node.id, node], [neighbor.id, neighbor]]),
      ),
    ).toBeUndefined();
  });

  it('returns undefined for nodes with only y positioned', () => {
    const node = makeNode('new.ts', undefined, 100);
    const neighbor = makeNode('anchor.ts', 100, 200);

    expect(
      resolveTimelineSeedNeighbor(
        node,
        [{ id: 'new.ts->anchor.ts', from: 'new.ts', to: 'anchor.ts', kind: 'import', sources: [] }],
        new Map([[node.id, node], [neighbor.id, neighbor]]),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when no connected neighbor can be resolved', () => {
    const node = makeNode('new.ts');
    const neighbor = makeNode('anchor.ts', 100, 200);

    expect(
      resolveTimelineSeedNeighbor(
        node,
        [{ id: 'other.ts->anchor.ts', from: 'other.ts', to: 'anchor.ts', kind: 'import', sources: [] }],
        new Map([[node.id, node], [neighbor.id, neighbor]]),
      ),
    ).toBeUndefined();
  });

  it('ignores unrelated edges before the connected edge', () => {
    const node = makeNode('new.ts');
    const stray = makeNode('stray.ts', 10, 20);
    const neighbor = makeNode('anchor.ts', 100, 200);

    expect(
      resolveTimelineSeedNeighbor(
        node,
        [
          { id: 'stray.ts->other.ts', from: 'stray.ts', to: 'other.ts', kind: 'import', sources: [] },
          { id: 'new.ts->anchor.ts', from: 'new.ts', to: 'anchor.ts', kind: 'import', sources: [] },
        ],
        new Map([[node.id, node], [stray.id, stray], [neighbor.id, neighbor]]),
      ),
    ).toBe(neighbor);
  });
});

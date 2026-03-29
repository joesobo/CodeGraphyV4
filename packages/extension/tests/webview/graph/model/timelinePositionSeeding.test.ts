import { describe, it, expect } from 'vitest';
import { seedTimelinePositions } from '../../../../src/webview/components/graph/model/timelinePositionSeeding';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';

function makeNode(id: string, x?: number, y?: number): FGNode {
  return { id, label: id, size: 16, color: '#93C5FD', borderColor: '#93C5FD', borderWidth: 2, baseOpacity: 1, isFavorite: false, x, y } as FGNode;
}

describe('graph/model/timelinePositionSeeding', () => {
  it('does nothing when previousPositions is null', () => {
    const node = makeNode('a.ts');
    seedTimelinePositions([node], [], null, Math.random);
    expect(node.x).toBeUndefined();
    expect(node.y).toBeUndefined();
  });

  it('does nothing when previousPositions is empty', () => {
    const node = makeNode('a.ts');
    seedTimelinePositions([node], [], new Map(), Math.random);
    expect(node.x).toBeUndefined();
    expect(node.y).toBeUndefined();
  });

  it('skips nodes that already have a position', () => {
    const node = makeNode('a.ts', 50, 60);
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);
    seedTimelinePositions(
      [node],
      [{ id: 'a.ts->anchor.ts', from: 'a.ts', to: 'anchor.ts' }],
      previousPositions,
      () => 0.75
    );
    expect(node.x).toBe(50);
    expect(node.y).toBe(60);
  });

  it('seeds a new node near a connected neighbor with a known position', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' }],
      previousPositions,
      () => 0.75
    );

    expect(newNode.x).toBe(110);
    expect(newNode.y).toBe(210);
  });

  it('skips a node when its neighbor has no recorded position', () => {
    const orphan = makeNode('orphan.ts');
    const previousPositions = new Map([['anchor.ts', { x: undefined, y: undefined }]]);

    seedTimelinePositions(
      [orphan],
      [{ id: 'orphan.ts->anchor.ts', from: 'orphan.ts', to: 'anchor.ts' }],
      previousPositions,
      () => 0.75
    );

    expect(orphan.x).toBeUndefined();
    expect(orphan.y).toBeUndefined();
  });

  it('skips a node that has no connected edges', () => {
    const solo = makeNode('solo.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions([solo], [], previousPositions, () => 0.75);

    expect(solo.x).toBeUndefined();
    expect(solo.y).toBeUndefined();
  });
});

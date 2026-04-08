import { describe, it, expect } from 'vitest';
import { seedTimelinePositions } from '../../../../src/webview/components/graph/model/timelinePositionSeeding';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';

function makeNode(id: string, x?: number, y?: number): FGNode {
  return { id, label: id, size: 16, color: '#93C5FD', borderColor: '#93C5FD', borderWidth: 2, baseOpacity: 1, isFavorite: false, x, y } as FGNode;
}

describe('seedTimelinePositions (mutation targets)', () => {
  it('seeds position using the "to" neighbor when node is the "from" in the edge', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'new.ts->anchor.ts', from: 'new.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.5
    );

    // random() = 0.5, so offset is (0.5 - 0.5) * 40 = 0
    expect(newNode.x).toBe(100);
    expect(newNode.y).toBe(200);
  });

  it('seeds position using the "from" neighbor when node is the "to" in the edge', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    expect(newNode.x).toBe(110);
    expect(newNode.y).toBe(210);
  });

  it('skips node when only x is defined', () => {
    const node = makeNode('a.ts', 50, undefined);
    // The node has x !== undefined, so it should be skipped
    // Actually checking the condition: x !== undefined || y !== undefined
    // 50 !== undefined => true, so skip
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);
    seedTimelinePositions(
      [node],
      [{ id: 'a.ts->anchor.ts', from: 'a.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );
    expect(node.x).toBe(50);
    expect(node.y).toBeUndefined();
  });

  it('skips node when only y is defined', () => {
    const node = makeNode('a.ts');
    node.y = 60;
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);
    seedTimelinePositions(
      [node],
      [{ id: 'a.ts->anchor.ts', from: 'a.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );
    expect(node.x).toBeUndefined();
    expect(node.y).toBe(60);
  });

  it('skips when neighbor x is undefined', () => {
    const neighborNode = makeNode('neighbor.ts', undefined, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['neighbor.ts', { x: undefined, y: 200 }]]);

    seedTimelinePositions(
      [neighborNode, newNode],
      [{ id: 'new.ts->neighbor.ts', from: 'new.ts', to: 'neighbor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    expect(newNode.x).toBeUndefined();
    expect(newNode.y).toBeUndefined();
  });

  it('skips when neighbor y is undefined', () => {
    const neighborNode = makeNode('neighbor.ts', 100, undefined);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['neighbor.ts', { x: 100, y: undefined }]]);

    seedTimelinePositions(
      [neighborNode, newNode],
      [{ id: 'new.ts->neighbor.ts', from: 'new.ts', to: 'neighbor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    expect(newNode.x).toBeUndefined();
    expect(newNode.y).toBeUndefined();
  });

  it('applies random offset correctly with random returning 0', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0
    );

    // offset = (0 - 0.5) * 40 = -20
    expect(newNode.x).toBe(80);
    expect(newNode.y).toBe(180);
  });

  it('applies random offset correctly with random returning 1', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 1
    );

    // offset = (1 - 0.5) * 40 = 20
    expect(newNode.x).toBe(120);
    expect(newNode.y).toBe(220);
  });
});

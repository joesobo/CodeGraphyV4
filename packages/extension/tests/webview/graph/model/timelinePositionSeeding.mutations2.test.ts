import { describe, it, expect } from 'vitest';
import { seedTimelinePositions } from '../../../../src/webview/components/graph/model/timelinePositionSeeding';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';

function makeNode(id: string, x?: number, y?: number): FGNode {
  return { id, label: id, size: 16, color: '#93C5FD', borderColor: '#93C5FD', borderWidth: 2, baseOpacity: 1, isFavorite: false, x, y } as FGNode;
}

describe('seedTimelinePositions (mutation kill tests)', () => {
  /**
   * Kill L15:7 ConditionalExpression: false — mutant replaces
   *   `if (!previousPositions || previousPositions.size === 0) return;`
   * with `if (false) return;` for the !previousPositions part.
   * A non-null map with entries should NOT trigger the early return,
   * and seeding should actually happen.
   */
  it('seeds positions when previousPositions is non-null and non-empty', () => {
    const anchor = makeNode('anchor.ts', 100, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.5
    );

    // If the guard is bypassed (mutant: false), a null map would crash.
    // But more importantly, with a valid map, seeding must occur.
    expect(newNode.x).toBe(100);
    expect(newNode.y).toBe(200);
  });

  /**
   * Kill L15:29 ConditionalExpression: false — mutant replaces
   *   `previousPositions.size === 0` with `false`.
   * When previousPositions is non-null but empty (size === 0),
   * the function should return early and NOT seed anything.
   * If the mutant turns `size === 0` to false, it will try to
   * process nodes even with an empty map.
   */
  it('returns early without seeding when previousPositions is non-null but empty', () => {
    const newNode = makeNode('new.ts');
    const anchor = makeNode('anchor.ts', 100, 200);
    const emptyMap = new Map<string, { x: number | undefined; y: number | undefined }>();

    seedTimelinePositions(
      [anchor, newNode],
      [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      emptyMap,
      () => 0.5
    );

    // With an empty map, even though anchor has coords, the function
    // should return before processing. newNode should remain unseeded.
    expect(newNode.x).toBeUndefined();
    expect(newNode.y).toBeUndefined();
  });

  /**
   * Kill L20:9 ConditionalExpression: false (replaces `node.x !== undefined`)
   * and L20:33 ConditionalExpression: false (replaces `node.y !== undefined`).
   * If either side is replaced with false, a node that has BOTH x and y
   * already set would NOT be skipped and would get overwritten.
   */
  it('preserves both coordinates of an already-positioned node', () => {
    const existing = makeNode('existing.ts', 42, 84);
    const anchor = makeNode('anchor.ts', 100, 200);
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [existing, anchor],
      [{ id: 'existing.ts->anchor.ts', from: 'existing.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    expect(existing.x).toBe(42);
    expect(existing.y).toBe(84);
  });

  /**
   * Kill L20:9 LogicalOperator mutation — changes `||` to `&&`.
   * With `&&`, a node that has x defined but y undefined would NOT be
   * skipped (because `true && false === false`), and would get seeded.
   * The correct behavior: skip if EITHER x or y is defined.
   */
  it('skips node when only x is defined (logical OR not AND)', () => {
    const nodeWithX = makeNode('partial.ts', 77, undefined);
    const anchor = makeNode('anchor.ts', 100, 200);
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [nodeWithX, anchor],
      [{ id: 'partial.ts->anchor.ts', from: 'partial.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    // Should be skipped because x is defined
    expect(nodeWithX.x).toBe(77);
    expect(nodeWithX.y).toBeUndefined();
  });

  /**
   * Kill L22:42 ConditionalExpression: true — mutant replaces
   *   `candidate.to === node.id` with `true`.
   * This means edges.find would match ANY edge, even ones not connected
   * to the node. We test with a node that has NO matching edges.
   */
  it('does not seed a node when no edge connects to it', () => {
    const isolated = makeNode('isolated.ts');
    const anchor = makeNode('anchor.ts', 100, 200);
    const previousPositions = new Map([['anchor.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [isolated, anchor],
      // Edge between OTHER nodes, not involving 'isolated.ts'
      [{ id: 'other.ts->anchor.ts', from: 'other.ts', to: 'anchor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    expect(isolated.x).toBeUndefined();
    expect(isolated.y).toBeUndefined();
  });

  /**
   * Kill L27:38 OptionalChaining mutation — removes the `?.` on `neighbor?.y`.
   * If neighbor is undefined (not in nodePositionMap), accessing `.y`
   * without optional chaining would throw. We need a scenario where
   * the neighbor ID from the edge is NOT in the nodes array.
   */
  it('skips seeding when the neighbor node is not in the nodes array', () => {
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['ghost.ts', { x: 100, y: 200 }]]);

    seedTimelinePositions(
      [newNode], // ghost.ts is NOT in nodes
      [{ id: 'new.ts->ghost.ts', from: 'new.ts', to: 'ghost.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.75
    );

    // neighbor = nodePositionMap.get('ghost.ts') => undefined
    // Without optional chaining, this would throw
    expect(newNode.x).toBeUndefined();
    expect(newNode.y).toBeUndefined();
  });

  /**
   * Additional test for L27 — verify that when neighbor exists but has
   * undefined x, seeding is skipped (tests the `neighbor?.x === undefined` branch).
   */
  it('skips seeding when the neighbor exists but has undefined x', () => {
    const neighbor = makeNode('neighbor.ts', undefined, 200);
    const newNode = makeNode('new.ts');
    const previousPositions = new Map([['neighbor.ts', { x: undefined, y: 200 }]]);

    seedTimelinePositions(
      [newNode, neighbor],
      [{ id: 'new.ts->neighbor.ts', from: 'new.ts', to: 'neighbor.ts' , kind: 'import', sources: [] }],
      previousPositions,
      () => 0.5
    );

    expect(newNode.x).toBeUndefined();
    expect(newNode.y).toBeUndefined();
  });
});

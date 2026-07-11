import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  createGraphNodePositionMap,
  readNodePosition,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/positions';

describe('graph/runtime/use/interaction positions', () => {
  it('reads finite 2d node positions', () => {
    expect(readNodePosition({ id: 'a', x: 10, y: 20 } as FGNode)).toEqual({
      x: 10,
      y: 20,
    });
  });

  it('ignores non-finite positions', () => {
    expect(readNodePosition({ id: 'a', x: Number.NaN, y: 20 } as FGNode)).toBeUndefined();
    expect(readNodePosition({ id: 'b', x: 10, y: Number.POSITIVE_INFINITY } as FGNode)).toBeUndefined();
    expect(readNodePosition({ id: 'c', x: '10', y: 20 } as unknown as FGNode)).toBeUndefined();
  });

  it('builds a position map only for nodes with valid coordinates', () => {
    const positions = createGraphNodePositionMap([
      { id: 'a', x: 1, y: 2 },
      { id: 'b', x: 3, y: Number.POSITIVE_INFINITY },
      { id: 'c', x: 4, y: 5 },
    ] as FGNode[]);

    expect([...positions.entries()]).toEqual([
      ['a', { x: 1, y: 2 }],
      ['c', { x: 4, y: 5 }],
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  createGraphNodePositionMap,
  readNodePosition,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/positions';

describe('graph/runtime/use/interaction positions', () => {
  it('reads finite 2d and 3d node positions', () => {
    expect(readNodePosition({ id: 'a', x: 10, y: 20 } as FGNode, '2d')).toEqual({
      x: 10,
      y: 20,
    });
    expect(readNodePosition({ id: 'b', x: 10, y: 20, z: 30 } as FGNode, '3d')).toEqual({
      x: 10,
      y: 20,
      z: 30,
    });
  });

  it('ignores non-finite positions and missing 3d z coordinates', () => {
    expect(readNodePosition({ id: 'a', x: Number.NaN, y: 20 } as FGNode, '2d')).toBeUndefined();
    expect(readNodePosition({ id: 'b', x: 10, y: 20 } as FGNode, '3d')).toBeUndefined();
    expect(readNodePosition({ id: 'c', x: '10', y: 20 } as unknown as FGNode, '2d')).toBeUndefined();
  });

  it('builds a position map only for nodes with valid coordinates', () => {
    const positions = createGraphNodePositionMap([
      { id: 'a', x: 1, y: 2 },
      { id: 'b', x: 3, y: Number.POSITIVE_INFINITY },
      { id: 'c', x: 4, y: 5 },
    ] as FGNode[], '2d');

    expect([...positions.entries()]).toEqual([
      ['a', { x: 1, y: 2 }],
      ['c', { x: 4, y: 5 }],
    ]);
  });
});

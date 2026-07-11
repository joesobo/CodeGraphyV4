import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  createGraphNodePositionMap,
  readNodePosition,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/positions';

describe('graph/runtime/use/interaction positions', () => {

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

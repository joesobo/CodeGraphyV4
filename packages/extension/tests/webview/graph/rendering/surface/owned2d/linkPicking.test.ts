import { describe, expect, it } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  distanceToOwnedLink,
  pickOwnedGraphLink,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkPicking';

function link(curvature = 0): FGLink {
  const source = { id: 'a', label: 'a', x: 0, y: 0 } as FGNode;
  const target = { id: 'b', label: 'b', x: 100, y: 0 } as FGNode;
  return {
    id: 'a-b',
    from: 'a',
    to: 'b',
    source,
    target,
    bidirectional: false,
    curvature,
  };
}

describe('owned graph link picking', () => {
  it('picks straight links within a zoom-independent screen distance', () => {
    const straight = link();
    expect(pickOwnedGraphLink([straight], { x: 50, y: 5 }, 1)?.link).toBe(straight);
    expect(pickOwnedGraphLink([straight], { x: 50, y: 7 }, 1)).toBeUndefined();
    expect(pickOwnedGraphLink([straight], { x: 50, y: 0.5 }, 10)?.link).toBe(straight);
    expect(pickOwnedGraphLink([straight], { x: 50, y: 1 }, 10)).toBeUndefined();
  });

  it('follows curved link geometry and returns the nearest overlap', () => {
    const upward = link(0.5);
    const straight = link();
    expect(distanceToOwnedLink(upward, { x: 50, y: 25 })).toBeLessThan(1);
    expect(pickOwnedGraphLink([straight, upward], { x: 50, y: 24 }, 1)?.link).toBe(upward);
  });
});

import { describe, expect, it } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  distanceToOwnedLink,
  OwnedGraphLinkPicker,
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
    expect(distanceToOwnedLink(upward, { x: 50, y: -25 })).toBeLessThan(1);
    expect(pickOwnedGraphLink([straight, upward], { x: 50, y: -24 }, 1)?.link).toBe(upward);
  });

  it('indexes long diagonals by path length rather than bounding-box area', () => {
    const diagonal = link();
    (diagonal.target as FGNode).x = 10_000;
    (diagonal.target as FGNode).y = 10_000;
    const picker = new OwnedGraphLinkPicker();

    picker.rebuild([diagonal]);

    expect(picker.indexedEntryCount).toBeLessThan(200);
    expect(picker.pick({ x: 5_000, y: 5_000 }, 1)?.link).toBe(diagonal);
  });

  it('indexes straight, curved, and moved link bounds without changing exact picks', () => {
    const straight = link();
    const curved = link(2);
    const picker = new OwnedGraphLinkPicker();
    picker.rebuild([straight, curved]);

    expect(picker.pick({ x: 50, y: -100 }, 1)?.link).toBe(curved);
    expect(picker.pick({ x: 50, y: 0 }, 1)?.link).toBe(straight);

    (straight.source as FGNode).x = 1_000;
    (straight.target as FGNode).x = 1_100;
    picker.rebuild([straight, curved]);
    expect(picker.pick({ x: 1_050, y: 0 }, 1)?.link).toBe(straight);
    expect(picker.pick({ x: 50, y: 0 }, 1)).toBeUndefined();
  });
});

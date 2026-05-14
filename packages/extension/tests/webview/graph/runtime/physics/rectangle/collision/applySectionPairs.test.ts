import { describe, expect, it } from 'vitest';
import type { GraphLayoutSettings } from '../../../../../../../src/shared/settings/graphLayout';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import { applyRectangleCollisions } from '../../../../../../../src/webview/components/graph/runtime/physics/rectangle/collision/apply';

const GRAPH_LAYOUT: GraphLayoutSettings = {
  collapsedNodes: {},
  ownership: {},
  pinnedNodes: {},
  sections: {},
};

function node(overrides: Partial<FGNode>): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#60a5fa',
    id: 'node',
    isFavorite: false,
    isPinned: false,
    label: 'node',
    size: 10,
    x: 0,
    y: 0,
    ...overrides,
  } as FGNode;
}

function section(overrides: Partial<FGNode>): FGNode {
  return node({
    id: 'section',
    isGraphSection: true,
    sectionHeight: 100,
    sectionWidth: 100,
    ...overrides,
  });
}

describe('applyRectangleCollisions section pairs', () => {
  it('collides each pair of expanded sections once', () => {
    const left = section({ id: 'left', x: 0, y: 0 });
    const right = section({ id: 'right', x: 90, y: 0 });

      applyRectangleCollisions([left, right], GRAPH_LAYOUT, undefined);
    expect(left.vx).toBe(-5);
    expect(left.vy).toBeUndefined();
    expect(right.vx).toBe(5);
    expect(right.vy).toBeUndefined();
    });
});

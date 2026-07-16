import { describe, expect, it } from 'vitest';
import {
  createGraphAccessibilityItems,
  type GraphScreenProjector,
} from '../../../../src/webview/components/graph/viewport/accessibility';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';

function node(overrides: Partial<FGNode>): FGNode {
  return {
    id: 'src/index.ts',
    label: 'index.ts',
    size: 18,
    color: '#93C5FD',
    borderColor: '#000000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    ...overrides,
  };
}

function link(overrides: Partial<FGLink>): FGLink {
  return {
    id: 'src/index.ts->src/types.ts#import',
    from: 'src/index.ts',
    to: 'src/types.ts',
    source: 'src/index.ts',
    target: 'src/types.ts',
    bidirectional: false,
    ...overrides,
  };
}

describe('graph viewport accessibility', () => {
  it('projects graph node coordinates into screen-positioned accessibility items', () => {
    const projector: GraphScreenProjector = {
      graph2ScreenCoords: (x, y) => ({ x: x + 100, y: y + 50 }),
      zoom: () => 4,
    };

    expect(createGraphAccessibilityItems([
      node({ x: 12, y: 24 }),
    ], [], projector)).toEqual({
      nodes: [{
        kind: 'node',
        id: 'src/index.ts',
        label: 'Graph node src/index.ts',
        radius: 36,
        x: 112,
        y: 74,
      }],
      edges: [],
    });
  });

  it('labels edges by their source and target endpoints', () => {
    const projector: GraphScreenProjector = {
      graph2ScreenCoords: (x, y) => ({ x, y }),
      zoom: () => 1,
    };

    expect(createGraphAccessibilityItems([], [
      link({ source: node({ id: 'src/index.ts' }), target: node({ id: 'src/types.ts' }) }),
    ], projector).edges).toEqual([{
      kind: 'edge',
      id: 'src/index.ts->src/types.ts#import',
      label: 'Graph edge src/index.ts to src/types.ts',
    }]);
  });

  it('omits node items until the physics engine assigns finite coordinates', () => {
    const projector: GraphScreenProjector = {
      graph2ScreenCoords: (x, y) => ({ x, y }),
      zoom: () => 1,
    };

    expect(createGraphAccessibilityItems([
      node({ x: undefined, y: 24 }),
    ], [], projector).nodes).toEqual([]);
  });
});

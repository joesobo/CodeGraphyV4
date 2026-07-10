import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { getGraphNodeValue } from '../../../../../../src/webview/components/graph/rendering/surface/view/nodeValue';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src/app.ts',
    label: 'app.ts',
    size: 16,
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    ...overrides,
  } as FGNode;
}

describe('graph/rendering/surface/view/nodeValue', () => {

  it('uses the plugin pointer area diagonal for drag picking without changing node size', () => {
    expect(getGraphNodeValue(createNode({
      pointerArea2D: {
        height: 80,
        width: 120,
      },
      size: 12,
    }))).toBe(5200);
  });

  it('uses the visual rectangle diagonal when plugin nodes provide sized rectangles', () => {
    expect(getGraphNodeValue(createNode({
      shape2D: 'rectangle',
      shapeSize2D: {
        height: 80,
        width: 120,
      },
      size: 12,
    }))).toBe(5200);
  });
});

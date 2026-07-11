import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { OwnedGraphNodePicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking';

describe('owned graph spatial node picker', () => {
  it('finds the nearest node across spatial cells and honors minimum screen radius', () => {
    const nodes = [
      { id: 'near', x: 63, y: 63, size: 2 },
      { id: 'far', x: 500, y: 500, size: 10 },
    ] as FGNode[];
    const picker = new OwnedGraphNodePicker();
    picker.rebuild(nodes);

    expect(picker.pick({ x: 65, y: 65 }, 1)?.node.id).toBe('near');
    expect(picker.pick({ x: 504, y: 504 }, 1)?.node.id).toBe('far');
    expect(picker.pick({ x: 300, y: 300 }, 1)).toBeUndefined();
  });

  it('updates the index after layout positions change', () => {
    const node = { id: 'moving', x: 0, y: 0, size: 4 } as FGNode;
    const picker = new OwnedGraphNodePicker();
    picker.rebuild([node]);
    node.x = 200;
    node.y = 100;
    picker.rebuild([node]);

    expect(picker.pick({ x: 0, y: 0 }, 1)).toBeUndefined();
    expect(picker.pick({ x: 200, y: 100 }, 1)?.node.id).toBe('moving');
  });
});

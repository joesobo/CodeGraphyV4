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

  it('honors the full diagonal of plugin pointer areas', () => {
    const node = {
      id: 'plugin',
      x: 0,
      y: 0,
      collisionRadius2D: 200,
      pointerArea2D: { width: 120, height: 80 },
      shapeSize2D: { width: 300, height: 300 },
      size: 100,
    } as FGNode;
    const picker = new OwnedGraphNodePicker();
    picker.rebuild([node]);

    expect(picker.pick({ x: 60, y: 40 }, 1)?.node.id).toBe('plugin');
    expect(picker.pick({ x: 70, y: 0 }, 1)).toBeUndefined();
  });

  it('picks against the zoom-compensated rendered radius', () => {
    const picker = new OwnedGraphNodePicker();
    picker.rebuild([{ id: 'node', x: 0, y: 0, size: 8 } as FGNode]);

    expect(picker.pick({ x: 16, y: 0 }, 0.25)?.node.id).toBe('node');
    expect(picker.pick({ x: 25, y: 0 }, 0.25)).toBeUndefined();
    expect(picker.pick({ x: 4, y: 0 }, 4)?.node.id).toBe('node');
    expect(picker.pick({ x: 5, y: 0 }, 4)).toBeUndefined();
  });

  it('prefers the largest visually topmost node when hit areas overlap', () => {
    const picker = new OwnedGraphNodePicker();
    picker.rebuild([
      { id: 'leaf', x: 0, y: 0, size: 8 },
      { id: 'hub', x: 0, y: 0, size: 30 },
    ] as FGNode[]);

    expect(picker.pick({ x: 0, y: 0 }, 1)?.node.id).toBe('hub');
  });

  it('keeps distinct nodes pickable when their spatial cell hashes collide', () => {
    const first = { id: 'first', x: -119 * 64 + 1, y: -999 * 64 + 1, size: 4 } as FGNode;
    const second = { id: 'second', x: -921 * 64 + 1, y: -969 * 64 + 1, size: 4 } as FGNode;
    const picker = new OwnedGraphNodePicker();
    picker.rebuild([first, second]);

    expect(picker.pick({ x: first.x as number, y: first.y as number }, 1)?.node.id).toBe('first');
    expect(picker.pick({ x: second.x as number, y: second.y as number }, 1)?.node.id).toBe('second');
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

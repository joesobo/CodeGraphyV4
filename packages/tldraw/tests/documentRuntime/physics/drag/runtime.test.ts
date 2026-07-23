import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handlePointerEvent,
  type DragHost,
} from '../../../../src/documentRuntime/physics/drag/runtime';

const getNodeIndex = vi.fn(() => 0);
const pin = vi.fn();
const release = vi.fn();
const setAlphaTarget = vi.fn();
const setNodePosition = vi.fn();
const engine = {
  getNodeIndex,
  pin,
  release,
  setAlphaTarget,
  setNodePosition,
} as unknown as GraphLayoutEngine;

function createHost(options: { pageOffset?: { x: number; y: number }; selected?: boolean } = {}) {
  let node = {
    id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
    meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
  };
  const prepareEngine = vi.fn();
  const host: DragHost = {
    drag: {},
    getCurrentShapes: () => [node],
    getEngine: () => engine,
    getShapePageBounds: options.pageOffset
      ? shape => ({
        h: Number(shape.props.h),
        w: Number(shape.props.w),
        x: shape.x + (options.pageOffset?.x ?? 0),
        y: shape.y + (options.pageOffset?.y ?? 0),
      })
      : undefined,
    getSelectedShapes: () => options.selected ? [node] : [],
    prepareEngine,
  };
  return { host, moveNode: (x: number, y: number) => { node = { ...node, x, y }; }, prepareEngine };
}

describe('tldraw physics drag runtime', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ignores unrelated events, invalid shapes, and clicks without movement', () => {
    const { host } = createHost();
    const invalidShape = { ...host.getCurrentShapes()[0], type: 'note' };

    handlePointerEvent(host, { type: 'keyboard', name: 'key_down' });
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down' });
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down', shape: invalidShape });
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_up' });

    expect(pin).not.toHaveBeenCalled();
    expect(setAlphaTarget).not.toHaveBeenCalled();
  });

  it('pins once, follows live immutable positions, and releases after movement', () => {
    const { host, moveNode, prepareEngine } = createHost();
    const node = host.getCurrentShapes()[0];

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down', shape: node });
    moveNode(240, 120);
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_move' });
    moveNode(300, 180);
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_move' });

    expect(prepareEngine).toHaveBeenCalledTimes(2);
    expect(pin).toHaveBeenCalledOnce();
    expect(setAlphaTarget).toHaveBeenCalledWith(0.3);
    expect(setNodePosition).toHaveBeenNthCalledWith(1, 0, 60, 36);
    expect(setNodePosition).toHaveBeenNthCalledWith(2, 0, 72, 48);

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_up' });

    expect(release).toHaveBeenCalledWith(0);
    expect(setAlphaTarget).toHaveBeenLastCalledWith(0);
    expect(host.drag).toEqual({ entityId: undefined, nodeIndex: undefined, startPosition: undefined });
  });

  it('starts physics when tldraw drags an existing single-node selection', () => {
    const { host, moveNode } = createHost({ selected: true });

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down' });
    moveNode(240, 120);
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_move' });

    expect(pin).toHaveBeenCalledWith(0);
    expect(setAlphaTarget).toHaveBeenCalledWith(0.3);
    expect(setNodePosition).toHaveBeenCalledWith(0, 60, 36);
  });

  it('starts the node drag when its locked icon receives the pointer down event', () => {
    const { host, moveNode } = createHost();
    const icon = {
      id: 'shape:icon',
      type: 'image',
      x: 32,
      y: 32,
      props: { h: 56, w: 56 },
      meta: { codegraphyKind: 'icon', codegraphyNodeId: 'a' },
    };

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down', shape: icon });
    moveNode(240, 120);
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_move' });

    expect(pin).toHaveBeenCalledWith(0);
    expect(setNodePosition).toHaveBeenCalledWith(0, 60, 36);
  });

  it('sends a framed node page position to physics while it is dragged', () => {
    const { host, moveNode } = createHost({ pageOffset: { x: 400, y: 200 } });
    const node = host.getCurrentShapes()[0];

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_down', shape: node });
    moveNode(40, 20);
    handlePointerEvent(host, { type: 'pointer', name: 'pointer_move' });

    expect(setNodePosition).toHaveBeenCalledWith(0, 100, 56);
  });
});

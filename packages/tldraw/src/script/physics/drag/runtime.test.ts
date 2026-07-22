import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePointerEvent, type DragHost } from './runtime';

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

function createHost() {
  let node = {
    id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
    meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
  };
  const prepareEngine = vi.fn();
  const host: DragHost = {
    drag: {},
    getCurrentShapes: () => [node],
    getEngine: () => engine,
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
    expect(setNodePosition).toHaveBeenNthCalledWith(1, 0, 100, 60);
    expect(setNodePosition).toHaveBeenNthCalledWith(2, 0, 120, 80);

    handlePointerEvent(host, { type: 'pointer', name: 'pointer_up' });

    expect(release).toHaveBeenCalledWith(0);
    expect(setAlphaTarget).toHaveBeenLastCalledWith(0);
    expect(host.drag).toEqual({ entityId: undefined, nodeIndex: undefined, startPosition: undefined });
  });
});

import { describe, expect, it } from 'vitest';
import { beginDragSession, clearDragSession, nodeHasNotMoved, type DragState } from './model';

const NODE = {
  id: 'shape:a', type: 'geo', x: 10, y: 20, props: { w: 120, h: 120 },
  meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
};

describe('tldraw physics drag state', () => {
  it('tracks the drag origin and detects movement on either axis', () => {
    const state: DragState = {};

    beginDragSession(state, NODE);

    expect(state).toEqual({ entityId: 'a', nodeIndex: undefined, startPosition: { x: 10, y: 20 } });
    expect(nodeHasNotMoved(state, NODE)).toBe(true);
    expect(nodeHasNotMoved(state, { ...NODE, x: 11 })).toBe(false);
    expect(nodeHasNotMoved(state, { ...NODE, y: 21 })).toBe(false);
    state.nodeIndex = 0;
    expect(nodeHasNotMoved(state, NODE)).toBe(false);

    clearDragSession(state);
    expect(state).toEqual({ entityId: undefined, nodeIndex: undefined, startPosition: undefined });
  });
});

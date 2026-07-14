import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advanceOwnedGraphNodeHover,
  createOwnedGraphNodeHover,
  OWNED_GRAPH_NODE_HOVER_SCALE,
  setOwnedGraphNodeHover,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/nodeHover';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('owned graph node hover presentation', () => {
  it('eases a hovered node up and back to its exact base scale', () => {
    const hover = createOwnedGraphNodeHover();

    setOwnedGraphNodeHover(hover, 'node-4', 100);
    expect(hover).toMatchObject({ nodeId: 'node-4', scale: 1 });
    expect(advanceOwnedGraphNodeHover(hover, 160)).toBe(true);
    expect(hover.scale).toBeCloseTo((1 + OWNED_GRAPH_NODE_HOVER_SCALE) / 2, 8);
    expect(advanceOwnedGraphNodeHover(hover, 220)).toBe(false);
    expect(hover).toMatchObject({
      nodeId: 'node-4',
      scale: OWNED_GRAPH_NODE_HOVER_SCALE,
    });

    setOwnedGraphNodeHover(hover, null, 300);
    expect(advanceOwnedGraphNodeHover(hover, 360)).toBe(true);
    expect(hover.scale).toBeCloseTo((1 + OWNED_GRAPH_NODE_HOVER_SCALE) / 2, 8);
    expect(advanceOwnedGraphNodeHover(hover, 420)).toBe(false);
    expect(hover).toMatchObject({ nodeId: null, scale: 1, transition: null });
  });

  it('switches emphasis immediately to the newly hovered node', () => {
    const hover = createOwnedGraphNodeHover();
    setOwnedGraphNodeHover(hover, 'node-2', 100);
    advanceOwnedGraphNodeHover(hover, 160);

    setOwnedGraphNodeHover(hover, 'node-7', 160);
    expect(hover).toMatchObject({ nodeId: 'node-7', scale: 1 });
    expect(advanceOwnedGraphNodeHover(hover, 280)).toBe(false);
    expect(hover.scale).toBe(OWNED_GRAPH_NODE_HOVER_SCALE);
  });

  it('applies hover emphasis without animation when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const hover = createOwnedGraphNodeHover();

    setOwnedGraphNodeHover(hover, 'node-3', 100);
    expect(hover).toMatchObject({
      nodeId: 'node-3',
      scale: OWNED_GRAPH_NODE_HOVER_SCALE,
      transition: null,
    });
    setOwnedGraphNodeHover(hover, null, 200);
    expect(hover).toMatchObject({ nodeId: null, scale: 1, transition: null });
  });
});

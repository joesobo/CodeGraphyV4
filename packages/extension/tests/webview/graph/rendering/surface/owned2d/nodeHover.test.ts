import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advanceOwnedGraphNodeHover,
  createOwnedGraphNodeHover,
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
    advanceOwnedGraphNodeHover(hover, 160);
    expect(hover.scale).toBeCloseTo(1.05, 8);
    expect(hover.transition).not.toBeNull();
    advanceOwnedGraphNodeHover(hover, 220);
    expect(hover).toMatchObject({ nodeId: 'node-4', scale: 1.1, transition: null });

    setOwnedGraphNodeHover(hover, null, 300);
    advanceOwnedGraphNodeHover(hover, 360);
    expect(hover.scale).toBeCloseTo(1.05, 8);
    expect(hover.transition).not.toBeNull();
    advanceOwnedGraphNodeHover(hover, 420);
    expect(hover).toMatchObject({ nodeId: null, scale: 1, transition: null });
  });

  it('switches emphasis immediately to the newly hovered node', () => {
    const hover = createOwnedGraphNodeHover();
    setOwnedGraphNodeHover(hover, 'node-2', 100);
    advanceOwnedGraphNodeHover(hover, 160);

    setOwnedGraphNodeHover(hover, 'node-7', 160);
    expect(hover).toMatchObject({ nodeId: 'node-7', scale: 1 });
    advanceOwnedGraphNodeHover(hover, 280);
    expect(hover).toMatchObject({ scale: 1.1, transition: null });
  });

  it('applies hover emphasis without animation when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const hover = createOwnedGraphNodeHover();

    setOwnedGraphNodeHover(hover, 'node-3', 100);
    expect(hover).toMatchObject({
      nodeId: 'node-3',
      scale: 1.1,
      transition: null,
    });
    setOwnedGraphNodeHover(hover, null, 200);
    expect(hover).toMatchObject({ nodeId: null, scale: 1, transition: null });
  });
});

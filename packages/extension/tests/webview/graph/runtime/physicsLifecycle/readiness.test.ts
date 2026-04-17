import { describe, expect, it, vi } from 'vitest';
import {
  isPhysicsGraphReady,
  selectActivePhysicsGraph,
} from '../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness';

describe('graph/runtime/physicsLifecycle/readiness', () => {
  it('selects the active graph instance from the current mode', () => {
    const graph2d = { id: '2d' };
    const graph3d = { id: '3d' };

    expect(selectActivePhysicsGraph('2d', graph2d as never, graph3d as never)).toBe(graph2d);
    expect(selectActivePhysicsGraph('3d', graph2d as never, graph3d as never)).toBe(graph3d);
  });

  it('treats a missing graph as not ready and any 2d graph as ready', () => {
    expect(isPhysicsGraphReady('2d', undefined)).toBe(false);
    expect(isPhysicsGraphReady('3d', undefined)).toBe(false);
    expect(isPhysicsGraphReady('2d', {} as never)).toBe(true);
  });

  it('rejects 3d graphs that are missing the readiness probe methods', () => {
    const d3ForceGetter = vi.fn(() => ({}));
    const graphWithoutD3Force = Object.defineProperty({}, 'd3Force', {
      get: d3ForceGetter,
    });
    const graphWithoutBounds = {
      d3Force: vi.fn().mockReturnValue({}),
    };

    expect(isPhysicsGraphReady('3d', {} as never)).toBe(false);
    expect(isPhysicsGraphReady('3d', graphWithoutD3Force as never)).toBe(false);
    expect(isPhysicsGraphReady('3d', graphWithoutBounds as never)).toBe(false);

    expect(d3ForceGetter).toHaveBeenCalledOnce();
    expect(graphWithoutBounds.d3Force).not.toHaveBeenCalled();
  });

  it('rejects 3d graphs when required forces or bounds are unavailable', () => {
    expect(
      isPhysicsGraphReady(
        '3d',
        {
          d3Force: vi.fn((name: string) => (name === 'charge' ? undefined : {})),
          getGraphBbox: vi.fn().mockReturnValue({}),
        } as never,
      ),
    ).toBe(false);

    expect(
      isPhysicsGraphReady(
        '3d',
        {
          d3Force: vi.fn((name: string) => (name === 'link' ? undefined : {})),
          getGraphBbox: vi.fn().mockReturnValue({}),
        } as never,
      ),
    ).toBe(false);

    expect(
      isPhysicsGraphReady(
        '3d',
        {
          d3Force: vi.fn().mockReturnValue({}),
          getGraphBbox: vi.fn().mockReturnValue(null),
        } as never,
      ),
    ).toBe(false);
  });

  it('accepts a ready 3d graph and guards exceptions from readiness probes', () => {
    expect(
      isPhysicsGraphReady(
        '3d',
        {
          d3Force: vi.fn().mockReturnValue({}),
          getGraphBbox: vi.fn().mockReturnValue({ x: [0, 1] }),
        } as never,
      ),
    ).toBe(true);

    expect(
      isPhysicsGraphReady(
        '3d',
        {
          d3Force: vi.fn(() => {
            throw new Error('boom');
          }),
          getGraphBbox: vi.fn().mockReturnValue({}),
        } as never,
      ),
    ).toBe(false);
  });
});

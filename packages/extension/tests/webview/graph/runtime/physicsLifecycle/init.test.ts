import { describe, expect, it, vi } from 'vitest';
import { resolvePhysicsInitAction } from '../../../../../src/webview/components/graph/runtime/physicsLifecycle/init';

function createReady3DGraph() {
  return {
    d3Force: vi.fn((name: string) => {
      if (name === 'charge' || name === 'link') {
        return {};
      }

      return undefined;
    }),
    getGraphBbox: vi.fn(() => ({
      x: [0, 100],
      y: [0, 100],
      z: [0, 100],
    })),
  };
}

describe('graph/runtime/physicsLifecycle/init', () => {
  it('skips initialization once physics is already initialized', () => {
    expect(
      resolvePhysicsInitAction({
        fg2d: {} as never,
        fg3d: {} as never,
        graphMode: '2d',
        physicsInitialised: true,
      }),
    ).toEqual({ type: 'skip' });
  });

  it('waits when the selected graph instance is not ready yet', () => {
    expect(
      resolvePhysicsInitAction({
        fg2d: {} as never,
        fg3d: undefined,
        graphMode: '3d',
        physicsInitialised: false,
      }),
    ).toEqual({ type: 'wait' });
  });

  it('initializes the selected active graph instance once it is ready', () => {
    const graph = createReady3DGraph();

    expect(
      resolvePhysicsInitAction({
        fg2d: {} as never,
        fg3d: graph as never,
        graphMode: '3d',
        physicsInitialised: false,
      }),
    ).toEqual({ instance: graph, type: 'init' });
  });
});

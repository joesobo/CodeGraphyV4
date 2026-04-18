import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  isPhysicsGraphReady,
  selectActivePhysicsGraph,
} from '../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness';
import {
  resolvePhysicsInitAction,
} from '../../../../src/webview/components/graph/runtime/physicsLifecycle/init';
import { shouldApplyPhysicsUpdate } from '../../../../src/webview/components/graph/runtime/physicsLifecycle/updates';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

function create2DGraph() {
  return {} as Parameters<typeof selectActivePhysicsGraph>[1];
}

function create3DGraph() {
  return {} as Parameters<typeof selectActivePhysicsGraph>[2];
}

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
  } as unknown as Parameters<typeof selectActivePhysicsGraph>[2];
}

describe('graph/runtime/physicsLifecycle', () => {
  it('returns the active 2d graph when graph mode is 2d', () => {
    const graph2D = create2DGraph();
    const graph3D = create3DGraph();

    expect(selectActivePhysicsGraph('2d', graph2D, graph3D)).toBe(graph2D);
  });

  it('returns the active 3d graph when graph mode is 3d', () => {
    const graph2D = create2DGraph();
    const graph3D = create3DGraph();

    expect(selectActivePhysicsGraph('3d', graph2D, graph3D)).toBe(graph3D);
  });

  it('treats 2d graphs as ready as soon as an instance exists', () => {
    expect(isPhysicsGraphReady('2d', create2DGraph())).toBe(true);
  });

  it('waits for 3d graphs until the force layout is available', () => {
    expect(isPhysicsGraphReady('3d', create3DGraph())).toBe(false);
  });

  it('treats 3d graphs as ready once charge and link forces are exposed', () => {
    expect(isPhysicsGraphReady('3d', createReady3DGraph())).toBe(true);
  });

  it('treats 3d graphs as not ready when the readiness probe throws', () => {
    const graph = {
      d3Force: vi.fn(() => {
        throw new Error('not ready');
      }),
      getGraphBbox: vi.fn(() => ({
        x: [0, 100],
        y: [0, 100],
        z: [0, 100],
      })),
    } as unknown as Parameters<typeof selectActivePhysicsGraph>[2];

    expect(isPhysicsGraphReady('3d', graph)).toBe(false);
  });

  it('waits for 3d graphs until a graph bounding box is available', () => {
    const graph = {
      d3Force: vi.fn((name: string) => {
        if (name === 'charge' || name === 'link') {
          return {};
        }

        return undefined;
      }),
      getGraphBbox: vi.fn(() => null),
    } as unknown as Parameters<typeof selectActivePhysicsGraph>[2];

    expect(isPhysicsGraphReady('3d', graph)).toBe(false);
  });

  it('does not compare settings before physics is initialized', () => {
    const haveSettingsChanged = vi.fn().mockReturnValue(true);

    expect(shouldApplyPhysicsUpdate({
      graph: create2DGraph(),
      haveSettingsChanged,
      physicsInitialised: false,
      physicsSettings: SETTINGS,
      previousPhysics: SETTINGS,
    })).toBe(false);
    expect(haveSettingsChanged).not.toHaveBeenCalled();
  });

  it('does not compare settings when the active graph is missing', () => {
    const haveSettingsChanged = vi.fn().mockReturnValue(true);

    expect(shouldApplyPhysicsUpdate({
      graph: undefined,
      haveSettingsChanged,
      physicsInitialised: true,
      physicsSettings: SETTINGS,
      previousPhysics: SETTINGS,
    })).toBe(false);
    expect(haveSettingsChanged).not.toHaveBeenCalled();
  });

  it('applies updates only when the active graph is initialized and settings changed', () => {
    const haveSettingsChanged = vi.fn().mockReturnValue(true);
    const graph = create2DGraph();

    expect(shouldApplyPhysicsUpdate({
      graph,
      haveSettingsChanged,
      physicsInitialised: true,
      physicsSettings: SETTINGS,
      previousPhysics: SETTINGS,
    })).toBe(true);
    expect(haveSettingsChanged).toHaveBeenCalledWith(SETTINGS, SETTINGS);
  });

  it('skips initialization once physics is already initialized', () => {
    expect(resolvePhysicsInitAction({
      fg2d: create2DGraph(),
      fg3d: create3DGraph(),
      graphMode: '2d',
      physicsInitialised: true,
    })).toEqual({ type: 'skip' });
  });

  it('waits when the selected graph mode has no instance yet', () => {
    expect(resolvePhysicsInitAction({
      fg2d: create2DGraph(),
      fg3d: undefined,
      graphMode: '3d',
      physicsInitialised: false,
    })).toEqual({ type: 'wait' });
  });

  it('initializes the selected active graph instance', () => {
    const graph = createReady3DGraph();

    expect(resolvePhysicsInitAction({
      fg2d: create2DGraph(),
      fg3d: graph,
      graphMode: '3d',
      physicsInitialised: false,
    })).toEqual({ instance: graph, type: 'init' });
  });
});

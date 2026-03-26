import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/contracts';
import {
  resolvePhysicsInitAction,
  selectActivePhysicsGraph,
  shouldApplyPhysicsUpdate,
} from '../../../../src/webview/components/graph/runtime/physicsRuntimeHelpers';

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

describe('graph/runtime/physicsRuntimeHelpers', () => {
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
    const graph = create3DGraph();

    expect(resolvePhysicsInitAction({
      fg2d: create2DGraph(),
      fg3d: graph,
      graphMode: '3d',
      physicsInitialised: false,
    })).toEqual({ instance: graph, type: 'init' });
  });
});

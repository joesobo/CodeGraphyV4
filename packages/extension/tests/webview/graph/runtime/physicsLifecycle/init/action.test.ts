import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../src/shared/settings/physics';
import { isPhysicsGraphReady } from '../../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness';
import { resolvePhysicsInitAction } from '../../../../../../src/webview/components/graph/runtime/physicsLifecycle/init/action';
import { shouldApplyPhysicsUpdate } from '../../../../../../src/webview/components/graph/runtime/physicsLifecycle/updates';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

function create2DGraph() {
  return {} as NonNullable<Parameters<typeof isPhysicsGraphReady>[0]>;
}

describe('graph/runtime/physicsLifecycle', () => {
  it('treats a 2d graph as ready as soon as an instance exists', () => {
    expect(isPhysicsGraphReady(create2DGraph())).toBe(true);
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

  it('does not compare settings when the graph is missing', () => {
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

  it('applies updates only when the graph is initialized and settings changed', () => {
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
      physicsInitialised: true,
    })).toEqual({ type: 'skip' });
  });

  it('waits while the graph instance is unavailable', () => {
    expect(resolvePhysicsInitAction({
      fg2d: undefined,
      physicsInitialised: false,
    })).toEqual({ type: 'wait' });
  });

  it('initializes the 2d graph instance', () => {
    const graph = create2DGraph();

    expect(resolvePhysicsInitAction({
      fg2d: graph,
      physicsInitialised: false,
    })).toEqual({ instance: graph, type: 'init' });
  });
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';

const runtimeHarness = vi.hoisted(() => ({
  applyPhysicsSettings: vi.fn(),
  initPhysics: vi.fn(),
  resolvePhysicsInitAction: vi.fn(),
  selectActivePhysicsGraph: vi.fn(),
  shouldApplyPhysicsUpdate: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/runtime/physics', () => ({
  applyPhysicsSettings: runtimeHarness.applyPhysicsSettings,
  initPhysics: runtimeHarness.initPhysics,
  syncPhysicsAnimation: runtimeHarness.syncPhysicsAnimation,
}));

vi.mock('../../../../src/webview/components/graph/runtime/physicsLifecycle', () => ({
  resolvePhysicsInitAction: runtimeHarness.resolvePhysicsInitAction,
  selectActivePhysicsGraph: runtimeHarness.selectActivePhysicsGraph,
  shouldApplyPhysicsUpdate: runtimeHarness.shouldApplyPhysicsUpdate,
}));

import { usePhysicsRuntime } from '../../../../src/webview/components/graph/runtime/use/graph/physics';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

type UsePhysicsRuntimeOptions = Parameters<typeof usePhysicsRuntime>[0];
type Graph2DCurrent = UsePhysicsRuntimeOptions['fg2dRef']['current'];

function create2DGraph(): Graph2DCurrent {
  return {} as Graph2DCurrent;
}

describe('webview/graph/runtime/usePhysicsRuntime control flow', () => {
  beforeEach(() => {
    runtimeHarness.applyPhysicsSettings.mockReset();
    runtimeHarness.initPhysics.mockReset();
    runtimeHarness.resolvePhysicsInitAction.mockReset();
    runtimeHarness.selectActivePhysicsGraph.mockReset();
    runtimeHarness.shouldApplyPhysicsUpdate.mockReset();
    runtimeHarness.selectActivePhysicsGraph.mockReturnValue(create2DGraph());
    runtimeHarness.shouldApplyPhysicsUpdate.mockReturnValue(false);
  });

  it('waits and retries until the init helper returns an instance', () => {
    const frames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const graph = create2DGraph();
    const updatedSettings = {
      ...SETTINGS,
      damping: SETTINGS.damping + 0.1,
    };

    let resolveCalls = 0;
    runtimeHarness.resolvePhysicsInitAction.mockImplementation(() => {
      resolveCalls += 1;
      return resolveCalls === 1
        ? { type: 'wait' }
        : { instance: graph, type: 'init' };
    });

    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    expect(runtimeHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: graph,
      fg3d: undefined,
      graphMode: '2d',
      physicsInitialised: false,
    });
    expect(requestAnimationFrame).toHaveBeenCalled();

    rerender({ physicsSettings: updatedSettings });

    act(() => {
      frames.shift()?.(0);
    });

    expect(runtimeHarness.resolvePhysicsInitAction.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(runtimeHarness.initPhysics).toHaveBeenCalled();
    expect(runtimeHarness.initPhysics.mock.calls.at(-1)).toEqual([graph, updatedSettings]);
  });

  it('skips retrying when physics initialization is already complete', () => {
    const requestAnimationFrame = vi.fn();

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    runtimeHarness.resolvePhysicsInitAction.mockReturnValue({ type: 'skip' });

    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: create2DGraph() },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      layoutKey: 'layout:a',
      physicsSettings: SETTINGS,
    }));

    expect(runtimeHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: expect.any(Object),
      fg3d: undefined,
      graphMode: '2d',
      physicsInitialised: false,
    });
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(runtimeHarness.initPhysics).not.toHaveBeenCalled();
  });

  it('does not sync animation before initialization finishes for a newly selected graph mode', () => {
    const graph = create2DGraph();
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    runtimeHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    let resolveCalls = 0;
    runtimeHarness.resolvePhysicsInitAction.mockImplementation(() => {
      resolveCalls += 1;
      return resolveCalls === 1
        ? { type: 'wait' }
        : { instance: graph, type: 'init' };
    });

    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: undefined },
      fg3dRef: { current: graph },
      graphMode: '3d',
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsSettings: SETTINGS,
    }));

    expect(runtimeHarness.syncPhysicsAnimation).not.toHaveBeenCalled();

    act(() => {
      frames.shift()?.(0);
    });

    expect(runtimeHarness.initPhysics).not.toHaveBeenCalled();
    expect(runtimeHarness.syncPhysicsAnimation).not.toHaveBeenCalled();

    act(() => {
      frames.shift()?.(0);
    });

    expect(runtimeHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
    expect(runtimeHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });
});

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../src/shared/settings/physics';

const physicsHarness = vi.hoisted(() => ({
  initPhysics: vi.fn(),
  resolvePhysicsInitAction: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/physics', () => ({
  initPhysics: physicsHarness.initPhysics,
  syncPhysicsAnimation: physicsHarness.syncPhysicsAnimation,
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/physicsLifecycle', () => ({
  resolvePhysicsInitAction: physicsHarness.resolvePhysicsInitAction,
}));

import { usePhysicsRuntimeInit } from '../../../../../../src/webview/components/graph/runtime/use/graph/init';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

function createGraph() {
  return {} as Parameters<typeof usePhysicsRuntimeInit>[0]['fg2dRef']['current'];
}

describe('webview/graph/runtime/use/graph/init', () => {
  beforeEach(() => {
    physicsHarness.initPhysics.mockReset();
    physicsHarness.resolvePhysicsInitAction.mockReset();
    physicsHarness.syncPhysicsAnimation.mockReset();
  });

  it('defers the first 3d init by two frames and then initializes the graph', () => {
    const graph = createGraph();
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    physicsHarness.resolvePhysicsInitAction.mockReturnValue({
      instance: graph,
      type: 'init',
    });

    renderHook(() => usePhysicsRuntimeInit({
      fg2dRef: { current: undefined },
      fg3dRef: { current: graph },
      graphMode: '3d',
      physicsInitialisedRef: { current: false },
      physicsPaused: true,
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: true },
      previousPhysicsRef: { current: null },
    }));

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames.shift()?.(0);

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames.shift()?.(0);

    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledWith(graph, true);
  });

  it('initializes immediately in 2d mode and stores the current physics settings', () => {
    const graph = createGraph();
    const requestAnimationFrame = vi.fn();
    const cancelAnimationFrame = vi.fn();

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    physicsHarness.resolvePhysicsInitAction.mockReturnValue({
      instance: graph,
      type: 'init',
    });

    const physicsInitialisedRef = { current: false };
    const physicsSettingsRef = { current: SETTINGS };
    const previousPhysicsRef = { current: null as IPhysicsSettings | null };

    const { unmount } = renderHook(() => usePhysicsRuntimeInit({
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef,
      physicsPaused: false,
      physicsSettingsRef,
      pendingThreeDimensionalInitRef: { current: false },
      previousPhysicsRef,
    }));

    expect(physicsHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: graph,
      fg3d: undefined,
      graphMode: '2d',
      physicsInitialised: false,
    });
    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
    expect(previousPhysicsRef.current).toEqual(SETTINGS);
    expect(previousPhysicsRef.current).not.toBe(SETTINGS);
    expect(physicsInitialisedRef.current).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    unmount();

    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('skips initialization work when the lifecycle says to wait', () => {
    const requestAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    physicsHarness.resolvePhysicsInitAction.mockReturnValue({ type: 'skip' });

    renderHook(() => usePhysicsRuntimeInit({
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: false },
      physicsPaused: false,
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousPhysicsRef: { current: null },
    }));

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(physicsHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: undefined,
      fg3d: undefined,
      graphMode: '2d',
      physicsInitialised: false,
    });
  });

  it('cancels a pending retry on cleanup', () => {
    const cancelAnimationFrame = vi.fn();

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    physicsHarness.resolvePhysicsInitAction.mockReturnValue({ type: 'wait' });

    const { unmount } = renderHook(() => usePhysicsRuntimeInit({
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: false },
      physicsPaused: false,
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousPhysicsRef: { current: null },
    }));

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../../src/shared/settings/physics';

const physicsHarness = vi.hoisted(() => ({
  havePhysicsSettingsChanged: vi.fn(),
  initPhysics: vi.fn(),
  resolvePhysicsInitAction: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physics', () => ({
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
  initPhysics: physicsHarness.initPhysics,
  syncPhysicsAnimation: physicsHarness.syncPhysicsAnimation,
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physicsLifecycle/init/action', () => ({
  resolvePhysicsInitAction: physicsHarness.resolvePhysicsInitAction,
}));

import { usePhysicsRuntimeInit } from '../../../../../../../src/webview/components/graph/runtime/use/physics/hook/init';

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

describe('webview/graph/runtime/use/physics/init', () => {
  beforeEach(() => {
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.initPhysics.mockReset();
    physicsHarness.resolvePhysicsInitAction.mockReset();
    physicsHarness.syncPhysicsAnimation.mockReset();
  });

  it('initializes immediately and stores the current physics settings', () => {
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
      physicsInitialisedRef,
      physicsPaused: false,
      physicsSettingsRef,
      previousPhysicsRef,
    }));

    expect(physicsHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: graph,
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
      physicsInitialisedRef: { current: false },
      physicsPaused: false,
      physicsSettingsRef: { current: SETTINGS },
      previousPhysicsRef: { current: null },
    }));

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(physicsHarness.resolvePhysicsInitAction).toHaveBeenCalledWith({
      fg2d: undefined,
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
      physicsInitialisedRef: { current: false },
      physicsPaused: false,
      physicsSettingsRef: { current: SETTINGS },
      previousPhysicsRef: { current: null },
    }));

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
